import { useState } from "react";
import { useNavigate } from "react-router-dom";

const MOCK_STUDENTS = [
  { id: 1, name: "Aman", class: "10A", attendance: "92%" },
  { id: 2, name: "Riya", class: "10A", attendance: "88%" },
  { id: 3, name: "Rahul", class: "10B", attendance: "95%" },
  { id: 4, name: "Neha", class: "10B", attendance: "90%" }
];

export default function StudentList() {
  const [students] = useState(MOCK_STUDENTS);
  const [selectedClass, setSelectedClass] = useState("All");
  const navigate = useNavigate();
  const classes = ["All", "10A", "10B"];

  const filteredStudents =
    selectedClass === "All"
      ? students
      : students.filter(
        (student) => student.class === selectedClass
      );
  return (
    <div style={{ padding: "20px" }}>
      <h2>Students List</h2>
      <select
        value={selectedClass}
        onChange={(e) => setSelectedClass(e.target.value)}
        style={{ marginBottom: "15px", padding: "6px" }}
      >
        {classes.map((cls) => (
          <option key={cls} value={cls}>
            {cls}
          </option>
        ))}
      </select>
      {filteredStudents.map((student) => {
        const attendanceValue = parseInt(student.attendance);

        return (
          <div
            key={student.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: "1px solid #ddd",
              padding: "12px",
              marginBottom: "10px",
              borderRadius: "6px",
              backgroundColor: "#f9f9f9"
            }}
          >
            <span>{student.name}</span>
            <span>{student.class}</span>

            <span
              style={{
                padding: "4px 10px",
                borderRadius: "12px",
                fontWeight: "700",
                fontSize: "15px",
                color: "white",
                backgroundColor:
                  attendanceValue >= 90
                    ? "green"
                    : attendanceValue >= 75
                      ? "orange"
                      : "red"
              }}
            >
              {student.attendance}
            </span>
          </div>
        );
      })}


      <button onClick={() => navigate("/dashboard")}>
        Back to Dashboard
      </button>
    </div>
  );
}