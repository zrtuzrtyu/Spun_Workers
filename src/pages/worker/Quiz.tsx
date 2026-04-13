import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import WorkerLayout from "../../components/WorkerLayout";

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

  const handleAnswer = async (index: number) => {
    if (index === quizQuestions[currentQuestion].correct) {
      setScore(score + 1);
    }

    if (currentQuestion + 1 < quizQuestions.length) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Quiz finished
      if (score + (index === quizQuestions[currentQuestion].correct ? 1 : 0) === quizQuestions.length) {
        if (user) {
          await updateDoc(doc(db, "users", user.uid), {
            quizCompleted: true,
            trustTier: "New"
          });
          toast.success("Quiz passed! You can now start tasks.");
          navigate("/worker");
        }
      } else {
        toast.error("Quiz failed. Please try again.");
        setCurrentQuestion(0);
        setScore(0);
      }
    }
  };

  return (
    <WorkerLayout>
      <div className="max-w-2xl mx-auto bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl">
        <h1 className="text-2xl font-bold text-white mb-6">Worker Qualification Quiz</h1>
        <p className="text-zinc-400 mb-8">{quizQuestions[currentQuestion].question}</p>
        <div className="grid gap-4">
          {quizQuestions[currentQuestion].options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              className="bg-[#151515] hover:bg-[#202020] text-white p-4 rounded-xl border border-white/5 transition-all"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </WorkerLayout>
  );
}
