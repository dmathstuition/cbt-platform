import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import PageSkeleton from './components/PageSkeleton';
import './App.css';

// Eagerly load auth pages (always needed)
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Lazy load everything else
const StudentDashboard  = lazy(() => import('./pages/student/Dashboard'));
const TakeExam          = lazy(() => import('./pages/student/TakeExam'));
const Results           = lazy(() => import('./pages/student/Results'));
const Leaderboard       = lazy(() => import('./pages/student/Leaderboard'));
const ExamReview        = lazy(() => import('./pages/student/ExamReview'));

const TeacherDashboard  = lazy(() => import('./pages/teacher/Dashboard'));
const CreateExam        = lazy(() => import('./pages/teacher/CreateExam'));
const QuestionBank      = lazy(() => import('./pages/teacher/QuestionBank'));
const ExamResults       = lazy(() => import('./pages/teacher/ExamResults'));
const ManageQuestions   = lazy(() => import('./pages/teacher/ManageQuestions'));
const BulkUpload        = lazy(() => import('./pages/teacher/BulkUpload'));
const MissingStudents   = lazy(() => import('./pages/teacher/MissingStudents'));
const EditExam          = lazy(() => import('./pages/teacher/EditExam'));
const GradeSubmissions  = lazy(() => import('./pages/teacher/GradeSubmissions'));

const AdminDashboard    = lazy(() => import('./pages/admin/Dashboard'));
const ManageUsers       = lazy(() => import('./pages/admin/ManageUsers'));
const ManageExams       = lazy(() => import('./pages/admin/ManageExams'));
const ManageClasses     = lazy(() => import('./pages/admin/ManageClasses'));
const ManageSubjects    = lazy(() => import('./pages/admin/ManageSubjects'));
const AddUser           = lazy(() => import('./pages/admin/AddUser'));
const AllResults        = lazy(() => import('./pages/admin/AllResults'));
const SendNotification  = lazy(() => import('./pages/admin/SendNotification'));
const SchoolSettings    = lazy(() => import('./pages/admin/SchoolSettings'));

const ParentDashboard   = lazy(() => import('./pages/parent/Dashboard'));
const ChangePassword    = lazy(() => import('./pages/auth/ChangePassword'));
const Reports           = lazy(() => import('./pages/admin/Reports'));

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Student */}
            <Route path="/student/dashboard" element={
              <PrivateRoute allowedRoles={['student']}><StudentDashboard /></PrivateRoute>
            } />
            <Route path="/student/exam/:id" element={
              <PrivateRoute allowedRoles={['student']}><TakeExam /></PrivateRoute>
            } />
            <Route path="/student/results" element={
              <PrivateRoute allowedRoles={['student']}><Results /></PrivateRoute>
            } />
            <Route path="/student/leaderboard" element={
              <PrivateRoute allowedRoles={['student']}><Leaderboard /></PrivateRoute>
            } />
            <Route path="/student/review/:id" element={
              <PrivateRoute allowedRoles={['student']}><ExamReview /></PrivateRoute>
            } />

            {/* Teacher */}
            <Route path="/teacher/dashboard" element={
              <PrivateRoute allowedRoles={['teacher','school_admin']}><TeacherDashboard /></PrivateRoute>
            } />
            <Route path="/teacher/create-exam" element={
              <PrivateRoute allowedRoles={['teacher','school_admin']}><CreateExam /></PrivateRoute>
            } />
            <Route path="/teacher/question-bank" element={
              <PrivateRoute allowedRoles={['teacher','school_admin']}><QuestionBank /></PrivateRoute>
            } />
            <Route path="/teacher/exam/:id/results" element={
              <PrivateRoute allowedRoles={['teacher','school_admin']}><ExamResults /></PrivateRoute>
            } />
            <Route path="/teacher/exam/:id/questions" element={
              <PrivateRoute allowedRoles={['teacher','school_admin']}><ManageQuestions /></PrivateRoute>
            } />
            <Route path="/teacher/bulk-upload" element={
              <PrivateRoute allowedRoles={['teacher','school_admin']}><BulkUpload /></PrivateRoute>
            } />
            <Route path="/teacher/exam/:id/missing" element={
              <PrivateRoute allowedRoles={['teacher','school_admin']}><MissingStudents /></PrivateRoute>
            } />
            <Route path="/teacher/exam/:id/edit" element={
              <PrivateRoute allowedRoles={['teacher','school_admin']}><EditExam /></PrivateRoute>
            } />
            <Route path="/teacher/exam/:id/grade" element={
              <PrivateRoute allowedRoles={['teacher','school_admin']}><GradeSubmissions /></PrivateRoute>
            } />

            {/* Admin */}
            <Route path="/admin/dashboard" element={
              <PrivateRoute allowedRoles={['school_admin','super_admin']}><AdminDashboard /></PrivateRoute>
            } />
            <Route path="/admin/users" element={
              <PrivateRoute allowedRoles={['school_admin','super_admin']}><ManageUsers /></PrivateRoute>
            } />
            <Route path="/admin/users/add" element={
              <PrivateRoute allowedRoles={['school_admin','super_admin']}><AddUser /></PrivateRoute>
            } />
            <Route path="/admin/exams" element={
              <PrivateRoute allowedRoles={['school_admin','super_admin']}><ManageExams /></PrivateRoute>
            } />
            <Route path="/admin/classes" element={
              <PrivateRoute allowedRoles={['school_admin','super_admin']}><ManageClasses /></PrivateRoute>
            } />
            <Route path="/admin/subjects" element={
              <PrivateRoute allowedRoles={['school_admin','super_admin']}><ManageSubjects /></PrivateRoute>
            } />
            <Route path="/admin/results" element={
              <PrivateRoute allowedRoles={['school_admin','super_admin']}><AllResults /></PrivateRoute>
            } />
            <Route path="/admin/notifications" element={
              <PrivateRoute allowedRoles={['school_admin','super_admin']}><SendNotification /></PrivateRoute>
            } />
            <Route path="/admin/school-settings" element={
              <PrivateRoute allowedRoles={['school_admin','super_admin']}><SchoolSettings /></PrivateRoute>
            } />
            <Route path="/admin/reports" element={
              <PrivateRoute allowedRoles={['school_admin','super_admin']}><Reports /></PrivateRoute>
            } />

            {/* Parent */}
            <Route path="/parent/dashboard" element={
              <PrivateRoute allowedRoles={['parent']}><ParentDashboard /></PrivateRoute>
            } />

            <Route path="/change-password" element={
              <PrivateRoute allowedRoles={['student','teacher','school_admin','parent']}>
                <ChangePassword />
              </PrivateRoute>
            } />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;