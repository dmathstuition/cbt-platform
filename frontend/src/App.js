import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import StudentDashboard from './pages/student/Dashboard';
import TakeExam from './pages/student/TakeExam';
import Results from './pages/student/Results';
import Leaderboard from './pages/student/Leaderboard';
import TeacherDashboard from './pages/teacher/Dashboard';
import CreateExam from './pages/teacher/CreateExam';
import QuestionBank from './pages/teacher/QuestionBank';
import ExamResults from './pages/teacher/ExamResults';
import ManageQuestions from './pages/teacher/ManageQuestions';
import AdminDashboard from './pages/admin/Dashboard';
import ManageUsers from './pages/admin/ManageUsers';
import ManageExams from './pages/admin/ManageExams';
import ManageClasses from './pages/admin/ManageClasses';
import ManageSubjects from './pages/admin/ManageSubjects';
import AddUser from './pages/admin/AddUser';
import AllResults from './pages/admin/AllResults';
import ParentDashboard from './pages/parent/Dashboard';
import ExamReview from './pages/student/ExamReview';
import SendNotification from './pages/admin/SendNotification';
import BulkUpload from './pages/teacher/BulkUpload';
import SchoolSettings from './pages/admin/SchoolSettings';
import MissingStudents from './pages/teacher/MissingStudents';
import './App.css';


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Student */}
          <Route path="/student/dashboard" element={
            <PrivateRoute allowedRoles={['student']}>
              <StudentDashboard />
            </PrivateRoute>
          } />
          <Route path="/student/exam/:id" element={
            <PrivateRoute allowedRoles={['student']}>
              <TakeExam />
            </PrivateRoute>
          } />
          <Route path="/student/results" element={
            <PrivateRoute allowedRoles={['student']}>
              <Results />
            </PrivateRoute>
          } />
          <Route path="/student/leaderboard" element={
            <PrivateRoute allowedRoles={['student']}>
              <Leaderboard />
            </PrivateRoute>
          } />

          {/* Teacher */}
          <Route path="/teacher/dashboard" element={
            <PrivateRoute allowedRoles={['teacher', 'school_admin']}>
              <TeacherDashboard />
            </PrivateRoute>
          } />
          <Route path="/teacher/create-exam" element={
            <PrivateRoute allowedRoles={['teacher', 'school_admin']}>
              <CreateExam />
            </PrivateRoute>
          } />
          <Route path="/teacher/question-bank" element={
            <PrivateRoute allowedRoles={['teacher', 'school_admin']}>
              <QuestionBank />
            </PrivateRoute>
          } />
          <Route path="/teacher/exam/:id/results" element={
            <PrivateRoute allowedRoles={['teacher', 'school_admin']}>
              <ExamResults />
            </PrivateRoute>
          } />
          <Route path="/teacher/exam/:id/questions" element={
            <PrivateRoute allowedRoles={['teacher', 'school_admin']}>
              <ManageQuestions />
            </PrivateRoute>
          } />

          {/* Admin */}
          <Route path="/admin/dashboard" element={
            <PrivateRoute allowedRoles={['school_admin', 'super_admin']}>
              <AdminDashboard />
            </PrivateRoute>
          } />
          <Route path="/admin/users" element={
            <PrivateRoute allowedRoles={['school_admin', 'super_admin']}>
              <ManageUsers />
            </PrivateRoute>
          } />
          <Route path="/admin/users/add" element={
            <PrivateRoute allowedRoles={['school_admin', 'super_admin']}>
              <AddUser />
            </PrivateRoute>
          } />
          <Route path="/admin/exams" element={
            <PrivateRoute allowedRoles={['school_admin', 'super_admin']}>
              <ManageExams />
            </PrivateRoute>
          } />
          <Route path="/admin/classes" element={
            <PrivateRoute allowedRoles={['school_admin', 'super_admin']}>
              <ManageClasses />
            </PrivateRoute>
          } />
          <Route path="/admin/subjects" element={
            <PrivateRoute allowedRoles={['school_admin', 'super_admin']}>
              <ManageSubjects />
            </PrivateRoute>
          } />
          <Route path="/admin/results" element={
            <PrivateRoute allowedRoles={['school_admin', 'super_admin']}>
              <AllResults />
            </PrivateRoute>
          } />

          <Route path="/admin/notifications" element={
            <PrivateRoute allowedRoles={['school_admin', 'super_admin']}>
              <SendNotification />
            </PrivateRoute>
          } />
          
           <Route path="/student/review/:id" element={
            <PrivateRoute allowedRoles={['student']}>
              <ExamReview />
            </PrivateRoute>
          } />
          
          <Route path="/teacher/bulk-upload" element={
            <PrivateRoute allowedRoles={['teacher', 'school_admin']}>
              <BulkUpload />
            </PrivateRoute>
          } />

          <Route path="/teacher/exam/:id/missing" element={
            <PrivateRoute allowedRoles={['teacher', 'school_admin']}>
              <MissingStudents />
            </PrivateRoute>
          } />

          <Route path="/admin/school-settings" element={
            <PrivateRoute allowedRoles={['school_admin', 'super_admin']}>
              <SchoolSettings />
            </PrivateRoute>
          } />

          {/* Parent */}
          <Route path="/parent/dashboard" element={
            <PrivateRoute allowedRoles={['parent']}>
              <ParentDashboard />
            </PrivateRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;