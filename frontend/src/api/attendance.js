import api from "./axiosClient";

export const captureAndSend = async (
  webcamRef,
  selectedSubject,
  setDetections,
  currentCoords
) => {
  
  const image = webcamRef.current?.getScreenshot();
  if (!image || !selectedSubject) return;

  try {
    const payload = {
      image,
      subject_id: selectedSubject,
    };

    if (currentCoords) {
      payload.latitude = currentCoords.latitude;
      payload.longitude = currentCoords.longitude;
    }

    const res = await api.post("/attendance/mark", payload);

    
    setDetections(res.data.faces);
  } catch (err) {
    console.error(
      "Attendance error:",
      err.response?.data || err.message
    );
  }
};
