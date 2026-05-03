import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import WorkerLayout from "@/components/WorkerLayout";

const quizQuestions = [
  {
    question: "What is the most important rule when submitting proof?",
    options: ["Submit as fast as possible", "Provide accurate, verifiable proof", "Guess if unsure", "Submit empty proof"],
    correct: 1
  },
  {
    question: "What should you do if a task link is broken?",
    options: ["Submit fake proof", "Report it to admin", "Ignore it", "Try another task"],
    correct: 1
  }
];

export default function WorkerQuiz() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  const handleAnswer = async (index: number) => {
    const newAnswers = [...answers, index];
    setAnswers(newAnswers);

    if (index === quizQuestions[currentQuestion].correct) {
      setScore(score + 1);
    }

    if (currentQuestion + 1 < quizQuestions.length) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Quiz finished
      const finalScore = score + (index === quizQuestions[currentQuestion].correct ? 1 : 0);
      
      if (user) {
        try {
          // Store answers
          await addDoc(collection(db, "quiz_answers"), {
            userId: user.uid,
            email: user.email,
            answers: newAnswers,
            score: finalScore,
            timestamp: serverTimestamp()
          });

          if (finalScore === quizQuestions.length) {
            await updateDoc(doc(db, "users", user.uid), {
              quizCompleted: true,
              trustTier: "New"
            });
            toast.success("Quiz passed! You can now start tasks.");
            navigate("/worker");
          } else {
            toast.error("Quiz failed. Please try again.");
            setCurrentQuestion(0);
            setScore(0);
            setAnswers([]);
          }
        } catch (error: any) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        }
      }
    }
  };

  return (
    <WorkerLayout>
      <div className="max-w-2xl mx-auto bg-card border border-border p-8 rounded-3xl">
        <h1 className="text-2xl font-semibold text-foreground mb-6">Worker Qualification Quiz</h1>
        <p className="text-zinc-400 mb-8">{quizQuestions[currentQuestion].question}</p>
        <div className="grid gap-4">
          {quizQuestions[currentQuestion].options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              className="bg-muted/50 hover:bg-muted text-foreground p-4 rounded-xl border border-border transition-all"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </WorkerLayout>
  );
}
