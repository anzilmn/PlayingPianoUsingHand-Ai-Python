🎹 Nexus AI | Virtual Piano Hand Landmark Tracker
This project utilizes advanced computer vision to track hand landmarks in real-time and map them to a virtual piano interface. Using MediaPipe, the system detects 21 hand joints to identify which "keys" the user is hovering over, enabling air-piano functionality.

🚀 Features
Real-Time Hand Tracking: Utilizes MediaPipe Hands to track 21 landmarks per hand with high precision.

Virtual Keyboard Mapping: Maps specific hand coordinates to a visual piano keyboard overlay.

Interaction Detection: Recognizes when fingers "press" a key based on proximity and landmark movement.

Performance Optimization: Designed to run at high FPS on standard webcams.

🛠️ Tech Stack
Python: Core logic engine.

MediaPipe: Hand landmark detection model.

OpenCV: Video capture and visual overlay rendering.

PyAutoGUI: (Optional) Mouse control integration.

🏁 Quick Start Guide1. PrerequisitesEnsure you have Python installed (3.8 - 3.12).2. InstallationClone the repository and install the required dependencies:Bashgit clone https://github.com/yourusername/piano-hand-landmark.git
cd piano-hand-landmark
pip install -r requirements.txt
3. Run the ApplicationStart the detection engine:Bashpython main.py
🧠 How it WorksInput: The system captures a live video feed from your webcam.Detection: MediaPipe identifies the hand and maps the 21 landmarks.Mapping: The index finger tip landmark ($x, y$) is mapped against the defined coordinates of the virtual piano keys on screen.Action: If the y coordinate of the finger tip passes a threshold, a "key press" event is registered.
