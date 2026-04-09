import { Routes, Route } from "react-router-dom";

import Layout from "./components/Layout.jsx";
import HomePage from "./pages/HomePage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import LearnPage from "./pages/LearnPage.jsx";
import QuizPage from "./pages/QuizPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/learn/:topicId" element={<LearnPage />} />
        <Route path="/quiz/:topicId" element={<QuizPage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Route>
    </Routes>
  );
}
