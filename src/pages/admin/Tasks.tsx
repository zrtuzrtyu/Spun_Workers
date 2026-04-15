import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { collection, query, onSnapshot, orderBy, doc, updateDoc, addDoc, serverTimestamp, getDocs, where, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/firebase";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Check, X, Edit2, Upload, Download, Database, Copy, CheckCircle2, Clock, XCircle, ShieldAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "motion/react";
import { isGeoMatch } from "@/lib/geoUtils";
import Papa from "papaparse";

const taskSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  payout: z.number().min(0.30).max(5.00),
  limit: z.number().min(1),
  link: z.string().url("Must be a valid URL").min(1, "Link is required"),
  targetGeo: z.string().optional(),
  requiredTier: z.enum(["New", "Trusted", "Premium"]).default("New"),
  category: z.string().min(1, "Category is required").default("General"),
});

type TaskForm = z.infer<typeof taskSchema>;

export default function AdminTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedAssignTasks, setSelectedAssignTasks] = useState<string[]>([]);
  const [selectedAssignWorkers, setSelectedAssignWorkers] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [overrideRestrictions, setOverrideRestrictions] = useState(false);
  const [assignResults, setAssignResults] = useState<{success: number, failed: number, details: string[]} | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const uniqueCategories = Array.from(new Set(tasks.map(t => t.category || "General")));

  const filteredTasks = tasks.filter(task => {
    const matchStatus = statusFilter === "all" || task.status === statusFilter;
    const matchCategory = categoryFilter === "all" || (task.category || "General") === categoryFilter;
    return matchStatus && matchCategory;
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const { register, handleSubmit, reset, trigger, watch, formState: { errors } } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema) as any,
    defaultValues: { payout: 0.5, limit: 10, targetGeo: "Global", requiredTier: "New", category: "General" }
  });

  const handleNextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (currentStep === 1) fieldsToValidate = ["title", "description", "category"];
    if (currentStep === 2) fieldsToValidate = ["link", "payout", "limit"];
    
    const isValid = await trigger(fieldsToValidate as any);
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  useEffect(() => {
    const qTasks = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "tasks");
    });

    const qWorkers = query(collection(db, "users"), where("role", "==", "worker"), where("status", "==", "active"));
    const unsubWorkers = onSnapshot(qWorkers, (snap) => {
      setWorkers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });

    return () => { unsubTasks(); unsubWorkers(); };
  }, []);

  const onSubmitTask = async (data: TaskForm) => {
    try {
      if (editingTaskId) {
        await updateDoc(doc(db, "tasks", editingTaskId), {
          ...data,
          updatedAt: serverTimestamp(),
        });
        toast.success("Task updated successfully!");
      } else {
        await addDoc(collection(db, "tasks"), {
          ...data,
          status: "active",
          createdAt: serverTimestamp(),
          createdBy: user?.uid
        });
        toast.success("Task created successfully!");
      }
      setIsCreating(false);
      setEditingTaskId(null);
      setCurrentStep(1);
      reset();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, editingTaskId ? `tasks/${editingTaskId}` : "tasks");
    }
  };

  const handleEditClick = (task: any) => {
    setEditingTaskId(task.id);
    reset({
      title: task.title,
      description: task.description,
      link: task.link,
      payout: task.payout,
      limit: task.limit,
      targetGeo: task.targetGeo || "Global",
      category: task.category || "General"
    });
    setCurrentStep(1);
    setIsCreating(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRepostClick = (task: any) => {
    setEditingTaskId(null); // Null means it will create a new task
    reset({
      title: `[Repost] ${task.title}`,
      description: task.description,
      link: task.link,
      payout: task.payout,
      limit: task.limit,
      targetGeo: task.targetGeo || "Global",
      category: task.category || "General"
    });
    setCurrentStep(1);
    setIsCreating(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
      toast.success(`Task status updated to ${newStatus}`);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
    }
  };

  const handleAssign = async () => {
    if (selectedAssignTasks.length === 0 || selectedAssignWorkers.length === 0) {
      toast.error("Please select at least one task and one worker");
      return;
    }

    setIsAssigning(true);
    let successCount = 0;
    let failedCount = 0;
    const details: string[] = [];

    for (const taskId of selectedAssignTasks) {
      const task = tasks.find(t => t.id === taskId);
      for (const workerId of selectedAssignWorkers) {
        const worker = workers.find(w => w.id === workerId);
        try {
          // Check Trust Tier
          const taskTier = task?.requiredTier || "New";
          const workerTier = worker?.trustTier || "New";
          
          const tierValues: Record<string, number> = { "New": 1, "Trusted": 2, "Premium": 3 };
          if (!overrideRestrictions && tierValues[workerTier] < tierValues[taskTier]) {
            failedCount++;
            details.push(`Task "${task?.title}" requires ${taskTier} tier. ${worker?.name} is ${workerTier}.`);
            continue;
          }

          // Check Geo
          const taskGeo = task?.targetGeo || "Global";
          const workerCountry = worker?.country || "Global";
          const geoMatch = isGeoMatch(taskGeo, workerCountry);
          
          if (!overrideRestrictions && !geoMatch) {
            failedCount++;
            details.push(`Task "${task?.title}" is for ${taskGeo}. ${worker?.name} is from ${workerCountry}.`);
            continue;
          }

          // Check if already assigned
          const existingQuery = query(collection(db, "assignments"), where("taskId", "==", taskId), where("workerId", "==", workerId));
          const existingSnap = await getDocs(existingQuery);
          if (!existingSnap.empty) {
            failedCount++;
            details.push(`Task "${task?.title}" already assigned to ${worker?.name}`);
            continue;
          }

          // Check task limit
          const taskAssignmentsQuery = query(collection(db, "assignments"), where("taskId", "==", taskId));
          const taskAssignmentsSnap = await getDocs(taskAssignmentsQuery);
          if (!overrideRestrictions && taskAssignmentsSnap.size >= (task?.limit || Infinity)) {
            failedCount++;
            details.push(`Task "${task?.title}" has reached its limit of ${task?.limit} assignments.`);
            continue;
          }

          await addDoc(collection(db, "assignments"), {
            taskId: taskId,
            workerId: workerId,
            status: "pending",
            assignedAt: serverTimestamp()
          });

          await addDoc(collection(db, "activities"), {
            type: "task_assigned",
            description: `Task "${task?.title}" assigned to worker ${worker?.name}`,
            createdAt: serverTimestamp(),
            userId: workerId,
            taskId: taskId,
            taskTitle: task?.title,
            workerName: worker?.name,
            amount: task?.payout
          });

          successCount++;
        } catch (error) {
          console.error(error);
          failedCount++;
          details.push(`Failed to assign "${task?.title}" to ${worker?.name}`);
        }
      }
    }

    setIsAssigning(false);
    setAssignResults({ success: successCount, failed: failedCount, details });
    if (successCount > 0) {
      toast.success(`Successfully assigned ${successCount} tasks!`);
      setSelectedAssignTasks([]);
      setSelectedAssignWorkers([]);
    }
    if (failedCount > 0) {
      toast.error(`Failed to assign ${failedCount} tasks. See details.`);
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedTasks.length === 0) return;
    try {
      await Promise.all(selectedTasks.map(taskId => 
        updateDoc(doc(db, "tasks", taskId), { status: newStatus })
      ));
      toast.success(`Updated ${selectedTasks.length} tasks to ${newStatus}`);
      setSelectedTasks([]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update tasks");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;
    try {
      await Promise.all(selectedTasks.map(taskId => 
        deleteDoc(doc(db, "tasks", taskId))
      ));
      toast.success(`Deleted ${selectedTasks.length} tasks`);
      setSelectedTasks([]);
      setShowDeleteModal(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete tasks");
    }
  };

  const toggleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length && filteredTasks.length > 0) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map(t => t.id));
    }
  };

  const toggleSelectTask = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const downloadTemplate = () => {
    const headers = ["title", "description", "payout", "limit", "link", "targetGeo", "requiredTier", "category"];
    const sampleRow = ["Sample Task", "Please complete this survey and provide a screenshot.", "1.50", "100", "https://example.com/survey", "Global", "New", "Survey"];
    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "task_upload_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const tasksToCreate = results.data.map((row: any) => ({
            title: row.title || "Untitled Task",
            description: row.description || "No description provided.",
            payout: parseFloat(row.payout) || 0.5,
            limit: parseInt(row.limit) || 10,
            link: row.link || "https://example.com",
            targetGeo: row.targetGeo || "Global",
            requiredTier: row.requiredTier || "New",
            category: row.category || "General",
            status: "active",
            createdAt: serverTimestamp(),
            createdBy: user?.uid
          }));

          await Promise.all(tasksToCreate.map(task => addDoc(collection(db, "tasks"), task)));
          toast.success(`Successfully uploaded ${tasksToCreate.length} tasks!`);
        } catch (error) {
          console.error("Bulk upload error:", error);
          toast.error("Failed to upload some tasks. Check CSV format.");
        }
        // Reset file input
        e.target.value = '';
      },
      error: (error) => {
        console.error("CSV Parse Error:", error);
        toast.error("Failed to parse CSV file.");
      }
    });
  };

  const handlePrepopulate = async () => {
    const pilotTasks = [
      { title: "Step 1: Join InboxDollars (US)", description: "Sign up using a valid email address and complete all required steps. You must confirm your email to qualify. Incomplete or invalid submissions will not be rewarded.", payout: 0.55, limit: 15, link: "https://afflat3d3.com/trk/lnk/0C3A139E-9517-46F7-825B-A826E3E5BA17/?o=6365&c=918277&a=762196&k=9838B6D2A0321F5B49ACF0C15C4AD4CC&l=5077&s1={user_id}&s2=inboxdollars&s3=pilot_t1_us_01&s4={attempt_id}", targetGeo: "US", requiredTier: "New", category: "Sign Up", status: "active", createdAt: serverTimestamp(), createdBy: user?.uid },
      { title: "Quick InboxDollars Signup (US)", description: "Use a valid email address and complete the signup carefully. Email confirmation is required to qualify.", payout: 0.6, limit: 15, link: "https://afflat3d3.com/trk/lnk/0C3A139E-9517-46F7-825B-A826E3E5BA17/?o=6365&c=918277&a=762196&k=9838B6D2A0321F5B49ACF0C15C4AD4CC&l=5077&s1={user_id}&s2=inboxdollars_b&s3=pilot_t1_us_02&s4={attempt_id}", targetGeo: "US", requiredTier: "New", category: "Sign Up", status: "active", createdAt: serverTimestamp(), createdBy: user?.uid },
      { title: "Earn Rewards Signup (AU)", description: "Register using accurate details and complete all required steps. You must confirm your email to qualify. Only Australian users should attempt this task.", payout: 1.25, limit: 20, link: "https://afflat3d2.com/trk/lnk/0C3A139E-9517-46F7-825B-A826E3E5BA17/?o=22888&c=918277&a=762196&k=3E3C714EE455484B4D586EE0AD4AD85D&l=23809&s1={user_id}&s2=rewardia&s3=pilot_t2_au_01&s4={attempt_id}", targetGeo: "AU", requiredTier: "New", category: "Sign Up", status: "active", createdAt: serverTimestamp(), createdBy: user?.uid },
      { title: "Reward Platform Registration (AU)", description: "Complete the registration using real details and confirm your email to qualify. Incomplete submissions will not be rewarded.", payout: 1.35, limit: 20, link: "https://afflat3d2.com/trk/lnk/0C3A139E-9517-46F7-825B-A826E3E5BA17/?o=22888&c=918277&a=762196&k=3E3C714EE455484B4D586EE0AD4AD85D&l=23809&s1={user_id}&s2=rewardia_b&s3=pilot_t2_au_02&s4={attempt_id}", targetGeo: "AU", requiredTier: "New", category: "Sign Up", status: "active", createdAt: serverTimestamp(), createdBy: user?.uid },
      { title: "Survey App Signup (US/CA iOS)", description: "Complete the signup on an iPhone or iPad and follow all required steps. This task is for eligible iOS users only.", payout: 1.8, limit: 8, link: "https://afflat3d2.com/trk/lnk/0C3A139E-9517-46F7-825B-A826E3E5BA17/?o=30409&c=918277&a=762196&k=598139E3053E05D523B64B71A673531A&l=34952&s1={user_id}&s2=survey_club_ios&s3=pilot_t3_ios_01&s4={attempt_id}", targetGeo: "US, CA", requiredTier: "New", category: "App Install", status: "active", createdAt: serverTimestamp(), createdBy: user?.uid },
      { title: "iOS Research App Registration (US/CA)", description: "Install or open the iOS app and complete all required steps. Only iPhone and iPad users should attempt this task.", payout: 1.95, limit: 8, link: "https://afflat3d2.com/trk/lnk/0C3A139E-9517-46F7-825B-A826E3E5BA17/?o=30409&c=918277&a=762196&k=598139E3053E05D523B64B71A673531A&l=34952&s1={user_id}&s2=survey_club_ios_b&s3=pilot_t3_ios_02&s4={attempt_id}", targetGeo: "US, CA", requiredTier: "New", category: "App Install", status: "active", createdAt: serverTimestamp(), createdBy: user?.uid }
    ];

    try {
      await Promise.all(pilotTasks.map(task => addDoc(collection(db, "tasks"), task)));
      toast.success("Successfully prepopulated pilot tasks!");
    } catch (error) {
      console.error("Prepopulate error:", error);
      toast.error("Failed to prepopulate tasks.");
    }
  };

  return (
    <AdminLayout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-outfit">Task Management</h1>
          <p className="text-white/60 font-jakarta">Create tasks, set payouts, and assign them to workers.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrepopulate}
            className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 font-medium py-2 px-4 rounded-xl transition-all flex items-center gap-2 text-sm"
            title="Prepopulate Pilot Tasks"
          >
            <Database className="w-4 h-4" />
            Prepopulate
          </button>
          <button
            onClick={downloadTemplate}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-2 px-4 rounded-xl transition-all flex items-center gap-2 text-sm"
            title="Download CSV Template"
          >
            <Download className="w-4 h-4" />
            Template
          </button>
          <label className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-2 px-4 rounded-xl transition-all flex items-center gap-2 text-sm cursor-pointer">
            <Upload className="w-4 h-4" />
            Bulk Upload CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
          </label>
          <button 
            onClick={() => {
              if (isCreating) {
                setIsCreating(false);
                setEditingTaskId(null);
                setCurrentStep(1);
                reset();
              } else {
                setIsCreating(true);
                setCurrentStep(1);
              }
            }}
            className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] flex items-center gap-2 text-sm"
          >
            {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isCreating ? "Cancel" : "Create Task"}
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 32 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-2xl relative shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
              <h2 className="text-xl font-semibold text-white mb-6 font-sans">{editingTaskId ? "Edit Task" : "Create New Task"}</h2>
              
              {/* Stepper Header */}
              <div className="flex items-center justify-between mb-8 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-white/10 z-0"></div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-purple-500 z-0 transition-all duration-300" style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}></div>
                
                {[1, 2, 3].map((step) => (
                  <div key={step} className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${currentStep >= step ? 'bg-purple-500 border-purple-500 text-white' : 'bg-[#0A0A0A] border-white/20 text-white/40'}`}>
                    {currentStep > step ? <Check className="w-5 h-5" /> : step}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit(onSubmitTask as any)} className="font-jakarta">
                {currentStep === 1 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white/80">Task Title</label>
                      <input 
                        {...register("title")} 
                        placeholder="e.g. Survey Signup - $0.50"
                        className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all focus:border-transparent"
                      />
                      {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white/80">Instructions / Description</label>
                      <textarea 
                        {...register("description")} 
                        rows={4}
                        placeholder="Step 1: Click link... Step 2: Submit email... Proof: Screenshot of success page"
                        className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none transition-all focus:border-transparent"
                      />
                      {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white/80">Category</label>
                      <input 
                        list="category-options"
                        {...register("category")} 
                        placeholder="Select or type a category"
                        className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all focus:border-transparent"
                      />
                      <datalist id="category-options">
                        <option value="Survey" />
                        <option value="Sign Up" />
                        <option value="App Install" />
                        <option value="Review" />
                        <option value="Testing" />
                        <option value="General" />
                      </datalist>
                      {errors.category && <p className="text-red-400 text-sm mt-1">{errors.category.message}</p>}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2 text-white/80">Target Geography</label>
                      <input 
                        {...register("targetGeo")} 
                        placeholder="e.g. Global, United States, India"
                        className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all focus:border-transparent"
                      />
                      <p className="text-xs text-white/40 mt-1">Leave as "Global" to allow all workers, or specify a country.</p>
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2 text-white/80">Task Link</label>
                      <input 
                        type="url"
                        {...register("link")} 
                        placeholder="https://example.com/task"
                        className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all focus:border-transparent"
                      />
                      {errors.link && <p className="text-red-400 text-sm mt-1">{errors.link.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white/80">Payout ($)</label>
                      <input 
                        type="number" step="0.01"
                        {...register("payout", { valueAsNumber: true })} 
                        className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all focus:border-transparent"
                      />
                      {errors.payout && <p className="text-red-400 text-sm mt-1">{errors.payout.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white/80">Worker Limit</label>
                      <input 
                        type="number"
                        {...register("limit", { valueAsNumber: true })} 
                        className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all focus:border-transparent"
                      />
                      {errors.limit && <p className="text-red-400 text-sm mt-1">{errors.limit.message}</p>}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2 text-white/80">Required Trust Tier</label>
                      <select 
                        {...register("requiredTier")} 
                        className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all focus:border-transparent"
                      >
                        <option value="New">New (All Workers)</option>
                        <option value="Trusted">Trusted (Proven Workers)</option>
                        <option value="Premium">Premium (Top Quality Only)</option>
                      </select>
                      <p className="text-xs text-white/40 mt-1">Restrict this task to workers who have earned a specific trust level.</p>
                    </div>
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div className="bg-[#050505] border border-white/10 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-white mb-4">Review Task Details</h3>
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-3">
                          <span className="text-white/60">Title</span>
                          <span className="col-span-2 text-white font-medium">{watch("title")}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-3">
                          <span className="text-white/60">Description</span>
                          <span className="col-span-2 text-white font-medium whitespace-pre-wrap">{watch("description")}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-3">
                          <span className="text-white/60">Link</span>
                          <span className="col-span-2 text-purple-400 break-all">{watch("link")}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-3">
                          <span className="text-white/60">Payout</span>
                          <span className="col-span-2 text-white font-medium">${watch("payout")?.toFixed(2)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-3">
                          <span className="text-white/60">Target Geo</span>
                          <span className="col-span-2 text-white font-medium">{watch("targetGeo") || "Global"}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-3">
                          <span className="text-white/60">Worker Limit</span>
                          <span className="col-span-2 text-white font-medium">{watch("limit")} workers</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-3">
                          <span className="text-white/60">Required Tier</span>
                          <span className="col-span-2 text-white font-medium">{watch("requiredTier") || "New"}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
                  {currentStep > 1 ? (
                    <button 
                      type="button" 
                      onClick={handlePrevStep}
                      className="bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 px-6 rounded-xl transition-all"
                    >
                      Back
                    </button>
                  ) : (
                    <div></div>
                  )}
                  
                  {currentStep < totalSteps ? (
                    <button 
                      type="button" 
                      onClick={handleNextStep}
                      className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                    >
                      Next Step
                    </button>
                  ) : (
                    <button 
                      type="submit"
                      className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-2.5 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]"
                    >
                      {editingTaskId ? "Update Task" : "Publish Task"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assignment Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#0A0A0A] border border-white/10 p-6 rounded-2xl mb-8 shadow-[0_0_30px_rgba(168,85,247,0.05)] relative"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500/0 via-purple-500/50 to-purple-500/0"></div>
        <h2 className="text-xl font-bold text-white mb-4 font-outfit">Bulk Assign Tasks</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Tasks List */}
          <div className="bg-[#050505] border border-white/10 rounded-xl overflow-hidden flex flex-col h-64">
            <div className="p-3 border-b border-white/10 bg-white/5 flex justify-between items-center">
              <span className="text-sm font-medium text-zinc-300">Select Tasks ({selectedAssignTasks.length})</span>
              <button 
                onClick={() => setSelectedAssignTasks(selectedAssignTasks.length === tasks.filter(t => t.status === "active").length ? [] : tasks.filter(t => t.status === "active").map(t => t.id))}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                {selectedAssignTasks.length === tasks.filter(t => t.status === "active").length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {tasks.filter(t => t.status === "active").map(t => (
                <label key={t.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedAssignTasks.includes(t.id) ? 'bg-purple-500/10 border border-purple-500/30' : 'hover:bg-white/5 border border-transparent'}`}>
                  <input 
                    type="checkbox" 
                    checked={selectedAssignTasks.includes(t.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedAssignTasks([...selectedAssignTasks, t.id]);
                      else setSelectedAssignTasks(selectedAssignTasks.filter(id => id !== t.id));
                    }}
                    className="w-4 h-4 rounded border-white/20 bg-transparent text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate flex items-center gap-2">
                      {t.title}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                        t.requiredTier === 'Premium' ? 'bg-amber-500/20 text-amber-400' :
                        t.requiredTier === 'Trusted' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {t.requiredTier || 'New'}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500">${t.payout.toFixed(2)} • {t.targetGeo || "Global"}</div>
                  </div>
                </label>
              ))}
              {tasks.filter(t => t.status === "active").length === 0 && (
                <div className="text-center text-zinc-500 text-sm p-4">No active tasks available.</div>
              )}
            </div>
          </div>

          {/* Workers List */}
          <div className="bg-[#050505] border border-white/10 rounded-xl overflow-hidden flex flex-col h-64">
            <div className="p-3 border-b border-white/10 bg-white/5 flex justify-between items-center">
              <span className="text-sm font-medium text-zinc-300">Select Workers ({selectedAssignWorkers.length})</span>
              <button 
                onClick={() => setSelectedAssignWorkers(selectedAssignWorkers.length === workers.length ? [] : workers.map(w => w.id))}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                {selectedAssignWorkers.length === workers.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {workers.map(w => (
                <label key={w.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedAssignWorkers.includes(w.id) ? 'bg-purple-500/10 border border-purple-500/30' : 'hover:bg-white/5 border border-transparent'}`}>
                  <input 
                    type="checkbox" 
                    checked={selectedAssignWorkers.includes(w.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedAssignWorkers([...selectedAssignWorkers, w.id]);
                      else setSelectedAssignWorkers(selectedAssignWorkers.filter(id => id !== w.id));
                    }}
                    className="w-4 h-4 rounded border-white/20 bg-transparent text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate flex items-center gap-2">
                      {w.name}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                        w.trustTier === 'Premium' ? 'bg-amber-500/20 text-amber-400' :
                        w.trustTier === 'Trusted' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {w.trustTier || 'New'}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500">{w.email} • {w.device}</div>
                  </div>
                </label>
              ))}
              {workers.length === 0 && (
                <div className="text-center text-zinc-500 text-sm p-4">No active workers available.</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="override" 
              checked={overrideRestrictions} 
              onChange={(e) => setOverrideRestrictions(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-transparent text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="override" className="text-sm font-medium text-amber-500 cursor-pointer flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Override Tier/Geo Restrictions
            </label>
          </div>
          <button 
            onClick={handleAssign}
            disabled={isAssigning || selectedAssignTasks.length === 0 || selectedAssignWorkers.length === 0}
            className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-xl transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] flex items-center gap-2"
          >
            {isAssigning ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Assigning...
              </>
            ) : (
              <>Assign {selectedAssignTasks.length * selectedAssignWorkers.length} Task(s)</>
            )}
          </button>
        </div>
      </motion.div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#0A0A0A] border border-purple-500/30 p-4 rounded-2xl mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
          >
            <div className="text-white font-jakarta">
              <span className="font-bold text-purple-400">{selectedTasks.length}</span> tasks selected
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleBulkStatusChange('active')}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Set Active
              </button>
              <button
                onClick={() => handleBulkStatusChange('inactive')}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Set Inactive
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-sm font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Delete Selected
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2 text-white/80">Filter by Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2 text-white/80">Filter by Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all cursor-pointer"
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)] relative"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="bg-[#050505] border-b border-white/10 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="p-4 w-12 whitespace-nowrap">
                  <input 
                    type="checkbox" 
                    checked={filteredTasks.length > 0 && selectedTasks.length === filteredTasks.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-white/20 bg-transparent text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                  />
                </th>
                <th className="p-4 font-semibold whitespace-nowrap">Task</th>
                <th className="p-4 font-semibold whitespace-nowrap">Category</th>
                <th className="p-4 font-semibold whitespace-nowrap">Payout</th>
                <th className="p-4 font-semibold whitespace-nowrap">Geo</th>
                <th className="p-4 font-semibold whitespace-nowrap">Tier</th>
                <th className="p-4 font-semibold whitespace-nowrap">Limit</th>
                <th className="p-4 font-semibold whitespace-nowrap">Status</th>
                <th className="p-4 font-semibold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-white/40">No tasks found matching filters.</td>
                </tr>
              ) : (
                filteredTasks.map((task, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={task.id} 
                    className={`hover:bg-white/5 transition-colors group ${selectedTasks.includes(task.id) ? 'bg-purple-500/5' : ''}`}
                  >
                    <td className="p-4 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        checked={selectedTasks.includes(task.id)}
                        onChange={() => toggleSelectTask(task.id)}
                        className="w-4 h-4 rounded border-white/20 bg-transparent text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-bold text-white group-hover:text-purple-400 transition-colors">{task.title}</div>
                      <div className="text-xs text-white/40 truncate max-w-xs">{task.description}</div>
                      {task.link && (
                        <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline truncate max-w-xs block mt-1">
                          {task.link}
                        </a>
                      )}
                      <div className="text-xs text-white/40 mt-1">Created: {task.createdAt?.toDate ? format(task.createdAt.toDate(), "MMM d, yyyy") : "Unknown"}</div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="bg-white/5 border border-white/10 text-white/80 text-xs px-2 py-1 rounded-md">
                        {task.category || "General"}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">${(task.payout || 0).toFixed(2)}</div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="text-sm text-white/80">{task.targetGeo || "Global"}</div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider ${
                        task.requiredTier === 'Premium' ? 'bg-amber-500/20 text-amber-400' :
                        task.requiredTier === 'Trusted' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {task.requiredTier || 'New'}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="text-sm text-white/80">{task.limit} workers</div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        task.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        task.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                        'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                      }`}>
                        {task.status === 'active' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {task.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                        {task.status === 'inactive' && <XCircle className="w-3.5 h-3.5" />}
                        {task.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRepostClick(task)}
                          className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-2 text-white transition-colors"
                          title="Repost Task"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditClick(task)}
                          className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-2 text-white transition-colors"
                          title="Edit Task"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <select 
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className="bg-[#050505] border border-white/10 rounded-lg p-2 text-sm text-white outline-none focus:border-purple-500 transition-colors cursor-pointer hover:bg-white/5"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2 font-outfit">Confirm Deletion</h3>
              <p className="text-white/60 font-jakarta mb-6">
                Are you sure you want to delete {selectedTasks.length} selected task{selectedTasks.length !== 1 ? 's' : ''}? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3 font-jakarta">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-xl text-white font-bold hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Results Modal */}
      <AnimatePresence>
        {assignResults && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl flex flex-col max-h-[80vh]"
            >
              <h3 className="text-xl font-bold text-white mb-4 font-outfit">Assignment Results</h3>
              
              <div className="flex gap-4 mb-6">
                <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{assignResults.success}</div>
                  <div className="text-xs text-green-500/70 uppercase tracking-wider font-bold mt-1">Successful</div>
                </div>
                <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-400">{assignResults.failed}</div>
                  <div className="text-xs text-red-500/70 uppercase tracking-wider font-bold mt-1">Failed</div>
                </div>
              </div>

              {assignResults.details.length > 0 && (
                <div className="flex-1 overflow-y-auto bg-[#050505] border border-white/5 rounded-xl p-4 mb-6 space-y-2">
                  <h4 className="text-sm font-bold text-white/80 mb-3">Failure Details:</h4>
                  {assignResults.details.map((detail, idx) => (
                    <div key={idx} className="text-sm text-red-400/80 flex items-start gap-2">
                      <X className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end mt-auto">
                <button
                  onClick={() => setAssignResults(null)}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
