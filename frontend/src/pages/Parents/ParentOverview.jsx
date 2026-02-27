import React from 'react';
import StudentHeaderCard from './components/StudentHeaderCard';
import AttendanceSummaryWidget from './components/AttendanceSummaryWidget';
import AttendanceTrendChart from './components/AttendanceTrendChart';
import SubjectCard from './components/SubjectCard';
import ReportSection from './components/ReportSection';

const ParentOverview = () => {
  // Mock Data
  const studentData = {
    id: "EE21BT023",
    name: "Nemchand",
    photo: "https://ui-avatars.com/api/?name=Nemchand&background=random&size=200", // Using placeholder for now
    course: "B.Tech Electrical Engineering",
    year: "3rd Year",
    institute: "IIT (BHU)",
    rollNo: "EE210123",
    section: "A", 
    term: "Jan - Jun 2026"
  };

  const attendanceSummary = {
    percentage: 82,
  };

  const trendData = [
    { name: 'Aug', attendance: 85 },
    { name: 'Sep', attendance: 78 },
    { name: 'Oct', attendance: 82 },
    { name: 'Nov', attendance: 88 },
    { name: 'Dec', attendance: 70 }, // Dip example
    { name: 'Jan', attendance: 82 },
  ];

  const subjects = [
    {
       name: "Power Systems",
       schedule: "Tue, Thu | 10:00 - 11:00",
       attended: 24,
       totalClasses: 28,
       professor: {
          name: "Dr. S. Verma",
          email: "sverma@iitbhu.ac.in",
          photo: ""
       }
    },
    {
       name: "Control Systems",
       schedule: "Mon, Wed | 11:00 - 12:00",
       attended: 20,
       totalClasses: 27,
       professor: {
          name: "Prof. A. Rao",
          email: "ar.rao@iitbhu.ac.in",
          photo: ""
       }
    }
  ];

  const reports = [
     {
        title: "Mid-term Report Card",
        date: "Mon, 10 Feb 2026",
        type: "Mid-term report"
     }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* 1. Student Header Card */}
      <section>
        <StudentHeaderCard student={studentData} />
      </section>

      {/* 2. Charts & Summary Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Attendance Summary (Left - Smaller) */}
        <div className="lg:col-span-4 h-full">
            <AttendanceSummaryWidget attendance={attendanceSummary} />
        </div>
        
        {/* Attendance Trend Chart (Right - Wider) */}
        <div className="lg:col-span-4 xl:col-span-5 h-full">
            <AttendanceTrendChart data={trendData} />
        </div>

        {/* Reports (Rightmost) */}
        <div className="lg:col-span-4 xl:col-span-3 h-full">
            <ReportSection reports={reports} />
        </div>
      </section>

      {/* 3. Subject Grid */}
      <section>
        <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-slate-900 text-lg">Subjects</h3>
             {/* <button className="text-indigo-600 text-sm font-medium hover:underline">View all</button> */}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {subjects.map((subj, idx) => (
                <SubjectCard key={idx} subject={subj} />
            ))}
            
            {/* Add more mock subjects if needed to fill space */}
            <SubjectCard subject={{
                 name: "Signals & Systems",
                 schedule: "Fri | 14:00 - 16:00",
                 attended: 22,
                 totalClasses: 22,
                 professor: { name: "Dr. K. Singh", email: "ksingh@iitbhu.ac.in", photo: "" }
            }} />
        </div>
      </section>
      
      <div className="h-12 md:h-0"></div> {/* Spacer for mobile nav */}
    </div>
  );
};

export default ParentOverview;
