import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Send,
  Clock,
  AlertTriangle,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Users,
  CheckCircle,
  XCircle,
  BarChart3,
  Loader2,
} from "lucide-react";
import {
  sendAbsenceNotifications,
  sendAssignmentReminders,
  sendExamAlerts,
  sendCustomMessage,
  getEmailStats,
} from "../api/notifications";
import { getStudents } from "../api/students";
import Spinner from "../components/Spinner";

export default function Messaging() {
  const navigate = useNavigate();
  const [user] = useState(() => {
    try {
      const data = localStorage.getItem("user");
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Failed to parse user data:", error);
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState("absence");
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [stats, setStats] = useState(null);
  const [result, setResult] = useState(null);

  // Form data for different notification types
  const [absenceData, setAbsenceData] = useState({
    subject: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [assignmentData, setAssignmentData] = useState({
    assignment_title: "",
    subject: "",
    due_date: "",
  });

  const [examData, setExamData] = useState({
    exam_name: "",
    subject: "",
    exam_date: "",
    time: "",
    venue: "",
  });

  const [customData, setCustomData] = useState({
    message_title: "",
    message_body: "",
  });

  // Redirect if user is not authenticated
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    loadStudents();
    loadStats();
  }, []);

  const loadStudents = async () => {
    try {
      setLoadingStudents(true);
      const response = await getStudents();
      setStudents(response.students || []);
    } catch (error) {
      console.error("Failed to load students:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getEmailStats(30);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s.email));
    }
  };

  const handleStudentToggle = (email) => {
    setSelectedStudents((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleSendAbsence = async () => {
    if (!absenceData.subject || selectedStudents.length === 0) {
      alert("Please fill in all fields and select at least one student");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await sendAbsenceNotifications({
        student_emails: selectedStudents,
        subject: absenceData.subject,
        date: absenceData.date,
        teacher_name: user?.name || "Your Teacher",
      });

      setResult(response);
      setSelectedStudents([]);
      setAbsenceData({ subject: "", date: new Date().toISOString().split("T")[0] });
      loadStats(); // Refresh stats
    } catch (error) {
      console.error("Failed to send notifications:", error);
      alert("Failed to send notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendAssignment = async () => {
    if (
      !assignmentData.assignment_title ||
      !assignmentData.subject ||
      !assignmentData.due_date ||
      selectedStudents.length === 0
    ) {
      alert("Please fill in all fields and select at least one student");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await sendAssignmentReminders({
        student_emails: selectedStudents,
        assignment_title: assignmentData.assignment_title,
        subject: assignmentData.subject,
        due_date: assignmentData.due_date,
        teacher_name: user?.name || "Your Teacher",
      });

      setResult(response);
      setSelectedStudents([]);
      setAssignmentData({ assignment_title: "", subject: "", due_date: "" });
      loadStats();
    } catch (error) {
      console.error("Failed to send reminders:", error);
      alert("Failed to send reminders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendExam = async () => {
    if (
      !examData.exam_name ||
      !examData.subject ||
      !examData.exam_date ||
      !examData.time ||
      !examData.venue ||
      selectedStudents.length === 0
    ) {
      alert("Please fill in all fields and select at least one student");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await sendExamAlerts({
        student_emails: selectedStudents,
        exam_name: examData.exam_name,
        subject: examData.subject,
        exam_date: examData.exam_date,
        time: examData.time,
        venue: examData.venue,
      });

      setResult(response);
      setSelectedStudents([]);
      setExamData({ exam_name: "", subject: "", exam_date: "", time: "", venue: "" });
      loadStats();
    } catch (error) {
      console.error("Failed to send alerts:", error);
      alert("Failed to send alerts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendCustom = async () => {
    if (
      !customData.message_title ||
      !customData.message_body ||
      selectedStudents.length === 0
    ) {
      alert("Please fill in all fields and select at least one student");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await sendCustomMessage({
        student_emails: selectedStudents,
        message_title: customData.message_title,
        message_body: customData.message_body,
        teacher_name: user?.name || "Your Teacher",
      });

      setResult(response);
      setSelectedStudents([]);
      setCustomData({ message_title: "", message_body: "" });
      loadStats();
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "absence", label: "Absence", icon: AlertTriangle },
    { id: "assignment", label: "Assignment", icon: BookOpen },
    { id: "exam", label: "Exam Alert", icon: GraduationCap },
    { id: "custom", label: "Custom Message", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Student Messaging</h1>
            <p className="text-gray-600 mt-1">
              Send notifications and messages to your students
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <Mail className="text-indigo-600" size={18} />
                <div className="text-sm">
                  <div className="text-gray-500">Emails sent (30 days)</div>
                  <div className="font-bold text-gray-900">
                    {stats ? stats.total_sent : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Message Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="flex border-b border-gray-200 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? "text-indigo-600 border-b-2 border-indigo-600"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Icon size={18} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="p-6">
                {/* Absence Tab */}
                {activeTab === "absence" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject/Class
                      </label>
                      <input
                        type="text"
                        value={absenceData.subject}
                        onChange={(e) =>
                          setAbsenceData({ ...absenceData, subject: e.target.value })
                        }
                        placeholder="e.g., Mathematics 101"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        value={absenceData.date}
                        onChange={(e) =>
                          setAbsenceData({ ...absenceData, date: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handleSendAbsence}
                      disabled={loading || selectedStudents.length === 0}
                      className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                      Send Absence Notification
                    </button>
                  </div>
                )}

                {/* Assignment Tab */}
                {activeTab === "assignment" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assignment Title
                      </label>
                      <input
                        type="text"
                        value={assignmentData.assignment_title}
                        onChange={(e) =>
                          setAssignmentData({
                            ...assignmentData,
                            assignment_title: e.target.value,
                          })
                        }
                        placeholder="e.g., Chapter 5 Homework"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={assignmentData.subject}
                        onChange={(e) =>
                          setAssignmentData({ ...assignmentData, subject: e.target.value })
                        }
                        placeholder="e.g., Mathematics"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={assignmentData.due_date}
                        onChange={(e) =>
                          setAssignmentData({ ...assignmentData, due_date: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handleSendAssignment}
                      disabled={loading || selectedStudents.length === 0}
                      className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                      Send Assignment Reminder
                    </button>
                  </div>
                )}

                {/* Exam Tab */}
                {activeTab === "exam" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Exam Name
                      </label>
                      <input
                        type="text"
                        value={examData.exam_name}
                        onChange={(e) =>
                          setExamData({ ...examData, exam_name: e.target.value })
                        }
                        placeholder="e.g., Midterm Examination"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={examData.subject}
                        onChange={(e) =>
                          setExamData({ ...examData, subject: e.target.value })
                        }
                        placeholder="e.g., Mathematics"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Exam Date
                        </label>
                        <input
                          type="date"
                          value={examData.exam_date}
                          onChange={(e) =>
                            setExamData({ ...examData, exam_date: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Time
                        </label>
                        <input
                          type="time"
                          value={examData.time}
                          onChange={(e) =>
                            setExamData({ ...examData, time: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Venue
                      </label>
                      <input
                        type="text"
                        value={examData.venue}
                        onChange={(e) =>
                          setExamData({ ...examData, venue: e.target.value })
                        }
                        placeholder="e.g., Room 101, Main Building"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handleSendExam}
                      disabled={loading || selectedStudents.length === 0}
                      className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                      Send Exam Alert
                    </button>
                  </div>
                )}

                {/* Custom Message Tab */}
                {activeTab === "custom" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message Title
                      </label>
                      <input
                        type="text"
                        value={customData.message_title}
                        onChange={(e) =>
                          setCustomData({ ...customData, message_title: e.target.value })
                        }
                        placeholder="e.g., Important Announcement"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message
                      </label>
                      <textarea
                        value={customData.message_body}
                        onChange={(e) =>
                          setCustomData({ ...customData, message_body: e.target.value })
                        }
                        placeholder="Type your message here..."
                        rows={6}
                        maxLength={2000}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      />
                      <div className="text-sm text-gray-500 mt-1 text-right">
                        {customData.message_body.length}/2000
                      </div>
                    </div>
                    <button
                      onClick={handleSendCustom}
                      disabled={loading || selectedStudents.length === 0}
                      className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                      Send Custom Message
                    </button>
                  </div>
                )}

                {/* Result Display */}
                {result && (
                  <div
                    className={`mt-6 p-4 rounded-lg ${
                      result.failed === 0
                        ? "bg-green-50 border border-green-200"
                        : "bg-yellow-50 border border-yellow-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {result.failed === 0 ? (
                        <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
                      ) : (
                        <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          Email Send Summary
                        </h3>
                        <div className="text-sm text-gray-700 space-y-1">
                          <div>Total Recipients: {result.total}</div>
                          <div className="text-green-700">✓ Successfully Sent: {result.sent}</div>
                          {result.failed > 0 && (
                            <div className="text-red-700">✗ Failed: {result.failed}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Student Selection */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Users size={18} />
                  Select Recipients
                </h3>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  {selectedStudents.length === students.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="text-sm text-indigo-900">
                  <span className="font-semibold">{selectedStudents.length}</span> student
                  {selectedStudents.length !== 1 ? "s" : ""} selected
                </div>
              </div>

              {loadingStudents ? (
                <div className="flex justify-center py-8">
                  <Spinner message="Loading students..." />
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {students.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No students found
                    </div>
                  ) : (
                    students.map((student) => (
                      <label
                        key={student.email}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.email)}
                          onChange={() => handleStudentToggle(student.email)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {student.name}
                          </div>
                          <div className="text-xs text-gray-500">{student.email}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Stats Card */}
            {stats && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <BarChart3 size={18} />
                  Email Statistics (30 days)
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Sent</span>
                    <span className="font-semibold text-green-600">{stats.total_sent}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Failed</span>
                    <span className="font-semibold text-red-600">{stats.total_failed}</span>
                  </div>
                  {stats.sent_by_type && Object.keys(stats.sent_by_type).length > 0 && (
                    <>
                      <hr className="my-3" />
                      <div className="text-xs font-medium text-gray-500 uppercase">By Type</div>
                      {Object.entries(stats.sent_by_type).map(([type, counts]) => (
                        <div key={type} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 capitalize">
                            {type.replaceAll("_", " ")}
                          </span>
                          <span className="text-gray-900">{counts.sent}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
