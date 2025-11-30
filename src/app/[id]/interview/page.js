"use client";
import { useParams } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";
import { db } from "../../../config/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { IconPlayerPlay, IconSquare, IconAlertCircle, IconDownload, IconRotateClockwise, IconPlayerStop, IconX } from "@tabler/icons-react";
import Webcam from "react-webcam";

export default function InterviewPage() {
    const params = useParams();
    const webcamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recognitionRef = useRef(null);

    const [transcript, setTranscript] = useState("");
    const [analysis, setAnalysis] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [requestingPermission, setRequestingPermission] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState("");
    const [speechSupported, setSpeechSupported] = useState(false);
    const [recordedChunks, setRecordedChunks] = useState([]);
    const [videoBlob, setVideoBlob] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [interviewQuestions, setInterviewQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [sessionStarted, setSessionStarted] = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [showStopConfirm, setShowStopConfirm] = useState(false);
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [showSkillSelection, setShowSkillSelection] = useState(true);
    const [questionAnswers, setQuestionAnswers] = useState([]);

    const availableSkills = [
        { id: 'javascript', name: 'JavaScript', color: 'yellow' },
        { id: 'react', name: 'React', color: 'blue' },
        { id: 'nodejs', name: 'Node.js', color: 'green' },
        { id: 'python', name: 'Python', color: 'indigo' },
        { id: 'java', name: 'Java', color: 'red' },
        { id: 'sql', name: 'SQL', color: 'purple' },
        { id: 'frontend', name: 'Frontend Developer', color: 'pink' },
        { id: 'backend', name: 'Backend Developer', color: 'emerald' },
        { id: 'fullstack', name: 'Full Stack Developer', color: 'violet' },
        { id: 'devops', name: 'DevOps', color: 'orange' },
        { id: 'dataScience', name: 'Data Science', color: 'cyan' },
        { id: 'ml', name: 'Machine Learning', color: 'teal' }
    ];

    const skillQuestions = {
        javascript: [
            "Explain the difference between let, const, and var in JavaScript.",
            "What are closures in JavaScript and how do you use them?",
            "Describe the event loop in JavaScript.",
            "What is the difference between == and === in JavaScript?",
            "Explain promises and async/await in JavaScript."
        ],
        react: [
            "What are React hooks and why are they useful?",
            "Explain the virtual DOM and how React uses it.",
            "What is the difference between state and props in React?",
            "How do you optimize performance in a React application?",
            "Explain the component lifecycle in React."
        ],
        nodejs: [
            "What is Node.js and how does it differ from browser JavaScript?",
            "Explain the event-driven architecture of Node.js.",
            "What are streams in Node.js and when would you use them?",
            "How do you handle errors in Node.js applications?",
            "Explain middleware in Express.js."
        ],
        python: [
            "What are decorators in Python and how do you use them?",
            "Explain the difference between lists and tuples in Python.",
            "What is a generator in Python and when would you use it?",
            "How does Python's garbage collection work?",
            "Explain the Global Interpreter Lock (GIL) in Python."
        ],
        java: [
            "Explain the difference between abstract classes and interfaces in Java.",
            "What is the Java Virtual Machine (JVM) and how does it work?",
            "Describe the different types of memory areas in Java.",
            "What are Java Streams and how do you use them?",
            "Explain exception handling in Java."
        ],
        sql: [
            "What is the difference between INNER JOIN and LEFT JOIN?",
            "Explain database normalization and its benefits.",
            "What are indexes and how do they improve query performance?",
            "Describe the ACID properties of database transactions.",
            "What is the difference between WHERE and HAVING clauses?"
        ],
        frontend: [
            "How do you ensure your web applications are accessible?",
            "Explain responsive design and mobile-first approach.",
            "What are your strategies for optimizing website performance?",
            "How do you handle cross-browser compatibility issues?",
            "Describe your approach to state management in frontend applications."
        ],
        backend: [
            "How do you design RESTful APIs?",
            "Explain your approach to database schema design.",
            "How do you handle authentication and authorization?",
            "What strategies do you use for API rate limiting?",
            "Describe your experience with microservices architecture."
        ],
        fullstack: [
            "How do you approach building a full-stack application from scratch?",
            "Explain how you handle communication between frontend and backend.",
            "What is your experience with deployment and CI/CD pipelines?",
            "How do you manage application state across the stack?",
            "Describe a challenging full-stack project you've worked on."
        ],
        devops: [
            "Explain the concept of Infrastructure as Code.",
            "What is your experience with containerization and Docker?",
            "How do you implement continuous integration and deployment?",
            "Describe your approach to monitoring and logging.",
            "What strategies do you use for scaling applications?"
        ],
        dataScience: [
            "Explain the difference between supervised and unsupervised learning.",
            "How do you handle missing data in a dataset?",
            "What is feature engineering and why is it important?",
            "Describe your experience with data visualization.",
            "How do you evaluate the performance of a machine learning model?"
        ],
        ml: [
            "Explain the bias-variance tradeoff in machine learning.",
            "What is overfitting and how do you prevent it?",
            "Describe different types of neural network architectures.",
            "How do you choose the right algorithm for a problem?",
            "Explain the concept of transfer learning."
        ]
    };

    const videoConstraints = {
        width: 1280,
        height: 720,
        facingMode: "user"
    };

    function cleanFeedback(text) {
    return text
        .replace(/[#*]/g, "")               // remove # and *
        .replace(/\*\*(.*?)\*\*/g, "$1")    // remove markdown bold
        .replace(/\n\s*\n/g, "\n")          // collapse extra blank lines
        .replace(/•/g, "• ")                // fix bullet spacing
        .trim();
}

    // Request camera and microphone permission explicitly
    const requestCameraPermission = async () => {
        try {
            setRequestingPermission(true);
            setCameraError(null);
            setError(null);
            
            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera and microphone access is not supported in this browser');
            }
            
            console.log('🎥 Requesting camera and microphone permission...');
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: videoConstraints, 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            console.log('✅ Camera and microphone permission granted');
            console.log('🎤 Audio tracks:', stream.getAudioTracks().length);
            console.log('📹 Video tracks:', stream.getVideoTracks().length);
            
            // Test if audio is working
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length > 0) {
                console.log('🎤 Microphone enabled:', audioTracks[0].label);
            } else {
                console.warn('⚠️ No audio tracks found');
            }
            
            // Permission granted, stop the stream as webcam component will handle it
            stream.getTracks().forEach(track => {
                console.log(`Stopping track: ${track.kind} - ${track.label}`);
                track.stop();
            });
            
            setPermissionGranted(true);
            setIsCameraReady(true);
            
            return true;
            
        } catch (err) {
            console.error('❌ Camera/Microphone permission error:', err);
            let errorMessage = 'Camera and microphone access denied. ';
            
            if (err.name === 'NotAllowedError') {
                errorMessage += 'Please click "Allow" when your browser asks for camera and microphone permission, then try again.';
            } else if (err.name === 'NotFoundError') {
                errorMessage += 'No camera or microphone found. Please connect devices and try again.';
            } else if (err.name === 'NotReadableError') {
                errorMessage += 'Camera or microphone is being used by another application. Please close other apps.';
            } else if (err.name === 'OverconstrainedError') {
                errorMessage += 'Camera or microphone does not support the required settings.';
            } else {
                errorMessage += err.message;
            }
            
            setCameraError(errorMessage);
            setError(errorMessage);
            setPermissionGranted(false);
            setIsCameraReady(false);
            
            return false;
        } finally {
            setRequestingPermission(false);
        }
    };

    // Speech Recognition Functions - Improved for better accuracy
    const startSpeechRecognition = useCallback(() => {
        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            
            if (!SpeechRecognition) {
                console.log('Speech recognition not supported in this browser');
                setSpeechSupported(false);
                return;
            }

            // Stop any existing recognition first
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    console.log('Error stopping previous recognition:', e);
                }
            }

            setSpeechSupported(true);
            const recognition = new SpeechRecognition();
            
            // Configure recognition settings for better accuracy
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "en-US";
            recognition.maxAlternatives = 3; // Get multiple alternatives for better accuracy
            
            let restartTimeout = null;
            let isManualStop = false;

            recognition.onstart = () => {
                console.log('✅ Speech recognition started successfully');
                setIsTranscribing(true);
                setError(null);
            };

            recognition.onresult = (event) => {
                console.log('🎤 Speech detected, processing...');
                let finalTranscript = '';
                let interimTranscript = '';
                
                // Process all results from the event
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    
                    // Get the best alternative (highest confidence)
                    let bestTranscript = result[0].transcript;
                    let bestConfidence = result[0].confidence;
                    
                    // Check other alternatives for better confidence
                    for (let j = 1; j < result.length; j++) {
                        if (result[j].confidence > bestConfidence) {
                            bestTranscript = result[j].transcript;
                            bestConfidence = result[j].confidence;
                        }
                    }
                    
                    if (result.isFinal) {
                        finalTranscript += bestTranscript + ' ';
                        console.log('✓ Final transcript:', bestTranscript, 'Confidence:', bestConfidence);
                    } else {
                        interimTranscript += bestTranscript;
                    }
                }

                // Update interim transcript for live display
                if (interimTranscript) {
                    setInterimTranscript(interimTranscript);
                }

                // Add final transcript to the main transcript
                if (finalTranscript.trim()) {
                    setTranscript(prev => {
                        const newTranscript = prev + finalTranscript;
                        console.log('📝 Updated transcript length:', newTranscript.length, 'words:', newTranscript.split(' ').length);
                        return newTranscript;
                    });
                    setInterimTranscript(''); // Clear interim when we have final
                }
            };

            recognition.onaudiostart = () => {
                console.log('🎙️ Audio capture started');
            };

            recognition.onaudioend = () => {
                console.log('🎙️ Audio capture ended');
            };

            recognition.onsoundstart = () => {
                console.log('🔊 Sound detected');
            };

            recognition.onsoundend = () => {
                console.log('🔇 Sound ended');
            };

            recognition.onspeechstart = () => {
                console.log('🗣️ Speech started');
            };

            recognition.onspeechend = () => {
                console.log('🗣️ Speech ended');
            };

            recognition.onerror = (event) => {
                console.error('❌ Speech recognition error:', event.error);
                
                if (event.error === 'no-speech') {
                    console.log('⏸️ No speech detected, will continue listening...');
                    // Don't show error for no-speech, just continue
                } else if (event.error === 'audio-capture') {
                    console.error('Microphone not accessible');
                    setError('Microphone not accessible. Please check your microphone connection.');
                    setIsTranscribing(false);
                } else if (event.error === 'not-allowed') {
                    console.error('Microphone permission denied');
                    setError('Microphone access denied. Please allow microphone access for transcription.');
                    setIsTranscribing(false);
                    isManualStop = true;
                } else if (event.error === 'network') {
                    console.error('Network error');
                    // Network errors are common, just restart
                } else if (event.error === 'aborted') {
                    console.log('Recognition aborted, will restart if needed');
                } else {
                    console.error('Other error:', event.error);
                }
            };

            recognition.onend = () => {
                console.log('🛑 Speech recognition ended');
                setInterimTranscript('');
                
                // Clear any pending restart
                if (restartTimeout) {
                    clearTimeout(restartTimeout);
                }
                
                // Restart recognition if still recording and not manually stopped
                if (isRecording && !isManualStop && recognitionRef.current === recognition) {
                    console.log('🔄 Auto-restarting speech recognition...');
                    restartTimeout = setTimeout(() => {
                        try {
                            if (isRecording && recognitionRef.current === recognition) {
                                recognition.start();
                            }
                        } catch (err) {
                            console.error('Error restarting recognition:', err);
                            setIsTranscribing(false);
                        }
                    }, 300); // Slightly longer delay for stability
                } else {
                    setIsTranscribing(false);
                    console.log('Not restarting - isRecording:', isRecording, 'isManualStop:', isManualStop);
                }
            };

            try {
                recognition.start();
                recognitionRef.current = recognition;
                console.log('🚀 Starting speech recognition...');
            } catch (err) {
                console.error('Error starting recognition:', err);
                throw err;
            }
            
        } catch (err) {
            console.error('Failed to initialize speech recognition:', err);
            setError('Failed to start speech recognition: ' + err.message);
            setSpeechSupported(false);
            setIsTranscribing(false);
        }
    }, [isRecording]);

    const stopSpeechRecognition = useCallback(() => {
        if (recognitionRef.current) {
            console.log('🛑 Manually stopping speech recognition');
            try {
                recognitionRef.current.stop();
            } catch (err) {
                console.error('Error stopping recognition:', err);
            }
            recognitionRef.current = null;
            setIsTranscribing(false);
            setInterimTranscript('');
        }
    }, []);

    // Check camera permission and speech support on component mount
    useEffect(() => {
        const checkPermissionsAndSupport = async () => {
            // Check camera permission
            try {
                const permission = await navigator.permissions.query({ name: 'camera' });
                
                if (permission.state === 'granted') {
                    console.log('Camera permission already granted');
                    setPermissionGranted(true);
                } else if (permission.state === 'prompt') {
                    console.log('Camera permission needs to be requested');
                } else {
                    console.log('Camera permission denied');
                    setCameraError('Camera permission was previously denied. Please enable it in your browser settings.');
                }
            } catch (err) {
                console.log('Permission API not supported, will request permission when needed');
            }

            // Check speech recognition support
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            setSpeechSupported(!!SpeechRecognition);
            
            if (!SpeechRecognition) {
                console.log('Speech recognition not supported in this browser');
            }
        };

        checkPermissionsAndSupport();
    }, []);

    const getDisplayName = () => {
        if (params.id) {
            const urlName = params.id.toString();
            if (urlName.includes('-')) {
                return urlName.split('-').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
            }
            return urlName.charAt(0).toUpperCase() + urlName.slice(1);
        }
        return 'User';
    };

    const handleDataAvailable = useCallback(
        ({ data }) => {
            if (data.size > 0) {
                setRecordedChunks((prev) => prev.concat(data));
            }
        },
        [setRecordedChunks]
    );

    const startRecording = useCallback(() => {
        if (!permissionGranted) {
            setError("Camera permission not granted. Please enable camera access first.");
            return;
        }

        if (!webcamRef.current || !webcamRef.current.stream) {
            setError("Camera not ready. Please wait for camera to initialize or refresh the page.");
            return;
        }

        setError(null);
        setRecordedChunks([]);
        
        try {
            const stream = webcamRef.current.stream;
            
            // Check if stream is active
            if (!stream.active) {
                setError("Camera stream is not active. Please refresh the page and try again.");
                return;
            }
            
            // Try different MIME types for better compatibility
            let mimeType = "video/webm";
            if (!MediaRecorder.isTypeSupported("video/webm")) {
                if (MediaRecorder.isTypeSupported("video/mp4")) {
                    mimeType = "video/mp4";
                } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
                    mimeType = "video/webm;codecs=vp8";
                } else {
                    mimeType = ""; // Let browser choose
                }
            }
            
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType
            });
            
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.addEventListener("dataavailable", handleDataAvailable);
            
            mediaRecorder.addEventListener("start", () => {
                console.log("Recording started");
                setIsRecording(true);
            });
            
            mediaRecorder.addEventListener("error", (event) => {
                console.error("MediaRecorder error:", event.error);
                setError("Recording error: " + event.error.message);
                setIsRecording(false);
            });
            
            mediaRecorder.start(1000); // Collect data every second
            
            // Start Web Speech API for live transcription
            if (speechSupported) {
                console.log('🎤 Starting Web Speech API for transcription...');
                setTimeout(() => {
                    startSpeechRecognition();
                }, 500); // Small delay to ensure recording is fully started
            } else {
                console.log('⚠️ Speech recognition not supported, recording without transcription');
                setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
            }
            
        } catch (err) {
            console.error("Failed to start recording:", err);
            setError("Failed to start recording: " + err.message);
        }
    }, [webcamRef, handleDataAvailable, permissionGranted, speechSupported, startSpeechRecognition]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            console.log('🛑 Stopping recording...');
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            
            // Stop Web Speech API
            console.log('🛑 Stopping Web Speech API...');
            stopSpeechRecognition();
        }
    }, [stopSpeechRecognition]);



    useEffect(() => {
        if (recordedChunks.length > 0 && !isRecording) {
            const blob = new Blob(recordedChunks, {
                type: "video/webm"
            });
            setVideoBlob(blob);
            
            // Store video locally
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = `interview-${params.id}-${Date.now()}.webm`;
            document.body.appendChild(a);
            // Don't auto-download, just prepare the blob
            document.body.removeChild(a);
        }
    }, [recordedChunks, isRecording, params.id]);

    const downloadVideo = () => {
        if (videoBlob) {
            const url = URL.createObjectURL(videoBlob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = `interview-${params.id}-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    const saveCurrentAnswer = () => {
        // Save the current transcript as the answer for the current question
        const updatedAnswers = [...questionAnswers];
        updatedAnswers[currentQuestionIndex] = transcript;
        setQuestionAnswers(updatedAnswers);
    };

    const analyzeInterview = async () => {
    saveCurrentAnswer();
    
    const finalAnswers = [...questionAnswers];
    finalAnswers[currentQuestionIndex] = transcript;

    if (finalAnswers.filter(a => a && a.trim()).length === 0) {
        setError('No answers recorded. Please answer at least one question.');
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
        // ✅ Use FormData instead of JSON
        const formData = new FormData();
        formData.append("transcript", finalAnswers.join("\n\n"));
        formData.append("userId", params.id);
        formData.append("questions", JSON.stringify(interviewQuestions));

        if (videoBlob) {
            formData.append("video", videoBlob, "interview-video.webm");
        }

        const response = await fetch('/api/interview/evaluate', {
            method: 'POST',
            body: formData,  // ❗ No headers here
        });

        if (!response.ok) {
            throw new Error('Evaluation failed');
        }

        const result = await response.json();

        setAnalysis(result);
        setSessionComplete(true);

        // Optional: Save to Firebase
        if (db) {
            await addDoc(collection(db, "interviews"), {
                userId: params.id,
                answers: finalAnswers,
                questions: interviewQuestions,
                selectedSkills: selectedSkills,
                evaluation: result,
                createdAt: serverTimestamp(),
            });
        }

    } catch (err) {
        console.error('Analysis error:', err);
        setError('Failed to analyze interview: ' + err.message);
    } finally {
        setIsLoading(false);
    }
};


    const toggleSkillSelection = (skillId) => {
        setSelectedSkills(prev => {
            if (prev.includes(skillId)) {
                return prev.filter(id => id !== skillId);
            } else {
                return [...prev, skillId];
            }
        });
    };

    const generateQuestions = () => {
        if (selectedSkills.length === 0) {
            setError('Please select at least one skill or role');
            return;
        }

        const questions = [];
        selectedSkills.forEach(skillId => {
            const skillQs = skillQuestions[skillId] || [];
            questions.push(...skillQs);
        });

        setInterviewQuestions(questions);
        setShowSkillSelection(false);
        setError(null);
    };

    const startNewSession = () => {
        setSessionStarted(false);
        setSessionComplete(false);
        setTranscript("");
        setAnalysis(null);
        setVideoBlob(null);
        setRecordedChunks([]);
        setCurrentQuestionIndex(0);
        setError(null);
        setSelectedSkills([]);
        setShowSkillSelection(true);
        setInterviewQuestions([]);
        setQuestionAnswers([]);
    };

    const stopSession = () => {
        setShowStopConfirm(true);
    };

    const confirmStopSession = () => {
        // Stop recording if active
        if (isRecording) {
            stopRecording();
        }
        
        // Stop speech recognition if active
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        
        // Reset session
        setSessionStarted(false);
        setSessionComplete(false);
        setShowStopConfirm(false);
        setError(null);
    };

    const cancelStopSession = () => {
        setShowStopConfirm(false);
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < interviewQuestions.length - 1) {
            // Save current answer before moving to next question
            saveCurrentAnswer();
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            // Load the next question's answer if it exists
            setTranscript(questionAnswers[currentQuestionIndex + 1] || '');
        }
    };

    const prevQuestion = () => {
        if (currentQuestionIndex > 0) {
            // Save current answer before moving to previous question
            saveCurrentAnswer();
            setCurrentQuestionIndex(currentQuestionIndex - 1);
            // Load the previous question's answer
            setTranscript(questionAnswers[currentQuestionIndex - 1] || '');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Modern Header */}
            <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                            <IconPlayerPlay className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                Interview Practice
                            </h1>
                            <p className="text-gray-600">Practice interviews with AI feedback to improve your performance</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center space-x-2">
                            <IconAlertCircle className="text-red-500" size={20} />
                            <p className="text-red-800">{error}</p>
                        </div>
                    </div>
                )}

                {/* Stop Session Confirmation Dialog */}
                {showStopConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Stop Interview Session?</h3>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to stop the interview session? Any current recording will be stopped and you'll lose your progress.
                            </p>
                            <div className="flex space-x-4">
                                <button
                                    onClick={confirmStopSession}
                                    className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <IconPlayerStop size={18} />
                                    <span>Yes, Stop Session</span>
                                </button>
                                <button
                                    onClick={cancelStopSession}
                                    className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    <IconX size={18} />
                                    <span>Cancel</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {!sessionStarted && !sessionComplete && (
                    <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-8">
                        <h2 className="text-gray-900 text-2xl font-semibold mb-4 text-center">Welcome to AI Interview Practice</h2>
                        <p className="text-gray-900 mb-6 text-center">
                            This session will record your video responses to interview questions based on your selected skills. 
                            Your performance will be analyzed and rated based on communication skills, 
                            confidence, and content quality.
                        </p>

                        {showSkillSelection ? (
                            <>
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6">
                                    <h3 className="font-semibold text-gray-900 mb-3 text-lg">Select Skills & Roles</h3>
                                    <p className="text-gray-700 text-sm mb-4">
                                        Choose the skills or roles you want to practice. Each selection adds 5 unique questions.
                                        <span className="block mt-1 text-blue-600 font-medium">
                                            Selected: {selectedSkills.length} ({selectedSkills.length * 5} questions)
                                        </span>
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {availableSkills.map(skill => {
                                            const isSelected = selectedSkills.includes(skill.id);
                                            const colorClasses = {
                                                yellow: isSelected 
                                                    ? 'bg-gradient-to-br from-yellow-500 to-amber-600 text-white shadow-lg ring-2 ring-yellow-400' 
                                                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-yellow-400 hover:bg-yellow-50',
                                                blue: isSelected 
                                                    ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg ring-2 ring-blue-400' 
                                                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50',
                                                green: isSelected 
                                                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg ring-2 ring-green-400' 
                                                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-400 hover:bg-green-50',
                                                indigo: isSelected 
                                                    ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg ring-2 ring-indigo-400' 
                                                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50',
                                                red: isSelected 
                                                    ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg ring-2 ring-red-400' 
                                                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-red-400 hover:bg-red-50',
                                                purple: isSelected 
                                                    ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg ring-2 ring-purple-400' 
                                                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50',
                                                pink: isSelected 
                                                    ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg ring-2 ring-pink-400' 
                                                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-pink-400 hover:bg-pink-50',
                                                emerald: isSelected 
                                                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg ring-2 ring-emerald-400' 
                                                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50',
                                                violet: isSelected 
                                                    ? 'bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg ring-2 ring-violet-400' 
                                                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-violet-400 hover:bg-violet-50',
                                                orange: isSelected 
                                                    ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg ring-2 ring-orange-400' 
                                                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50',
                                                cyan: isSelected 
                                                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg ring-2 ring-cyan-400' 
                                                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-cyan-400 hover:bg-cyan-50',
                                                teal: isSelected 
                                                    ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg ring-2 ring-teal-400' 
                                                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50'
                                            };
                                            
                                            return (
                                                <button
                                                    key={skill.id}
                                                    onClick={() => toggleSkillSelection(skill.id)}
                                                    className={`px-4 py-3 rounded-lg font-medium transition-all transform hover:scale-105 ${colorClasses[skill.color]}`}
                                                >
                                                    {skill.name}
                                                    {isSelected && (
                                                        <span className="ml-2">✓</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {selectedSkills.length > 0 && (
                                    <div className="text-center mb-6">
                                        <button
                                            onClick={generateQuestions}
                                            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg font-semibold text-lg"
                                        >
                                            Generate {selectedSkills.length * 5} Questions
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg mb-6 text-center">
                                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-2 text-xl">Questions Generated!</h3>
                                    <p className="text-gray-700 text-lg mb-1">
                                        {interviewQuestions.length} questions ready for your interview
                                    </p>
                                    <p className="text-gray-600 text-sm">
                                        Questions will be shown one at a time during the session
                                    </p>
                                </div>
                                <div className="text-center mb-6">
                                    <button
                                        onClick={() => {
                                            setShowSkillSelection(true);
                                            setInterviewQuestions([]);
                                        }}
                                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                                    >
                                        ← Change Skills Selection
                                    </button>
                                </div>
                            </>
                        )}
                        
                        {!showSkillSelection && (
                            <>
                                <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                                    <div className="flex items-center space-x-2">
                                        <IconAlertCircle className="text-yellow-600" size={20} />
                                        <div>
                                            <h4 className="font-semibold text-yellow-800">Camera & Microphone Access Required</h4>
                                            <p className="text-yellow-700 text-sm mb-2">
                                                This interview session requires camera and microphone access to record your responses and provide live transcription. 
                                                Please allow access when prompted by your browser.
                                            </p>
                                            <div className="flex text-black items-center space-x-4 text-xs">
                                                <div className="flex items-center space-x-1">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                    <span>Video Recording</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                    <span>Live Transcription</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                                    <span>AI Analysis</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <button
                                        onClick={async () => {
                                            const permissionGranted = await requestCameraPermission();
                                            if (permissionGranted) {
                                                setSessionStarted(true);
                                            }
                                        }}
                                        disabled={requestingPermission}
                                        className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold inline-flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {requestingPermission ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                <span>Requesting Camera Access...</span>
                                            </>
                                        ) : (
                                            <>
                                                <IconPlayerPlay size={20} />
                                                <span>Start Interview Session</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                        
                        {cameraError && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-start space-x-2">
                                    <IconAlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <h4 className="font-semibold text-red-800">Camera Access Required</h4>
                                        <p className="text-red-700 text-sm mt-1">{cameraError}</p>
                                        <button
                                            onClick={requestCameraPermission}
                                            className="mt-2 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors"
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {sessionStarted && !sessionComplete && (
                    <>
                        {/* Session Header with Stop Button */}
                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 mb-6">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-4">
                                    <h2 className="text-xl font-semibold text-gray-800">Interview Session Active</h2>
                                    <div className="flex items-center space-x-3">
                                        {isRecording && (
                                            <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                                                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                                                <span>Recording</span>
                                            </div>
                                        )}
                                        {isTranscribing && (
                                            <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                                                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                                                <span>Transcribing</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={stopSession}
                                    className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <IconPlayerStop size={18} />
                                    <span>Stop Session</span>
                                </button>
                            </div>
                        </div>

                        {/* Question Display */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-black text-lg font-semibold">
                                    Question {currentQuestionIndex + 1} of {interviewQuestions.length}
                                </h3>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={prevQuestion}
                                        disabled={currentQuestionIndex === 0}
                                        className="text-black px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={nextQuestion}
                                        disabled={currentQuestionIndex === interviewQuestions.length - 1}
                                        className="text-black px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-lg text-blue-900 font-medium">
                                    {interviewQuestions[currentQuestionIndex]}
                                </p>
                            </div>
                        </div>

                        {/* Video Recording Section */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                            <div className="relative">
                                {permissionGranted ? (
                                    <Webcam
                                        audio={true}
                                        ref={webcamRef}
                                        videoConstraints={videoConstraints}
                                        onUserMedia={() => {
                                            console.log('Webcam ready');
                                            setIsCameraReady(true);
                                            setCameraError(null);
                                        }}
                                        onUserMediaError={(error) => {
                                            console.error('Webcam error:', error);
                                            const errorMsg = `Camera error: ${error.message || error}`;
                                            setCameraError(errorMsg);
                                            setError(errorMsg);
                                            setIsCameraReady(false);
                                        }}
                                        className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
                                        screenshotFormat="image/jpeg"
                                    />
                                ) : (
                                    <div className="w-full max-w-2xl mx-auto bg-gray-100 rounded-lg flex items-center justify-center" style={{height: '480px'}}>
                                        <div className="text-center p-8">
                                            <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <IconAlertCircle className="text-gray-500" size={32} />
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-700 mb-2">Camera Access Required</h3>
                                            <p className="text-gray-600 mb-4">
                                                Please allow camera access to start your interview practice session.
                                            </p>
                                            <button
                                                onClick={requestCameraPermission}
                                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                Enable Camera
                                            </button>
                                            {cameraError && (
                                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                    <p className="text-red-800 text-sm">{cameraError}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {isRecording && (
                                    <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                        <span>Recording</span>
                                    </div>
                                )}
                            </div>

                            {/* Recording Controls */}
                            <div className="flex justify-center space-x-4 mt-6">
                                <button
                                    onClick={isRecording ? stopRecording : startRecording}
                                    disabled={!isCameraReady}
                                    className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                                        isRecording 
                                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg' 
                                            : 'bg-green-600 hover:bg-green-700 text-white'
                                    } disabled:opacity-50`}
                                >
                                    {isRecording ? <IconSquare size={20} /> : <IconPlayerPlay size={20} />}
                                    <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
                                </button>

                                {isRecording && (
                                    <button
                                        onClick={stopRecording}
                                        className="flex items-center space-x-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                                    >
                                        <IconPlayerStop size={20} />
                                        <span>Stop</span>
                                    </button>
                                )}

                                {videoBlob && (
                                    <button
                                        onClick={downloadVideo}
                                        className="flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <IconDownload size={20} />
                                        <span>Download Video</span>
                                    </button>
                                )}
                            </div>
                            
                            {/* Speech Recognition Test */}
                            {!isRecording && speechSupported && (
                                <div className="mt-4 text-center">
                                    <button
                                        onClick={() => {
                                            if (isTranscribing) {
                                                stopSpeechRecognition();
                                            } else {
                                                startSpeechRecognition();
                                            }
                                        }}
                                        className={`text-sm px-4 py-2 rounded-lg transition-colors ${
                                            isTranscribing 
                                                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                        }`}
                                    >
                                        {isTranscribing ? '🛑 Stop Test' : '🎤 Test Speech Recognition'}
                                    </button>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Test Web Speech API before recording
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Live Transcript Section */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-black text-lg font-semibold">Live Transcript (Web Speech API)</h3>
                                <div className="flex items-center space-x-2">
                                    {isTranscribing && (
                                        <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                                            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                                            <span>Transcribing</span>
                                        </div>
                                    )}
                                    {!speechSupported && (
                                        <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                                            Speech recognition not supported
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 p-4 rounded min-h-32 max-h-64 overflow-y-auto">
                                {transcript || interimTranscript ? (
                                    <div className="space-y-2">
                                        {/* Final transcript */}
                                        {transcript && (
                                            <div className="text-gray-900">
                                                {transcript.split('\n').map((line, index) => (
                                                    <p key={index} className="mb-2">{line}</p>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Interim transcript (live/in-progress) */}
                                        {interimTranscript && (
                                            <div className="text-gray-500 italic border-l-2 border-blue-400 pl-3">
                                                <span className="text-xs text-blue-600 block mb-1">Speaking...</span>
                                                {interimTranscript}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500 italic mb-2">
                                            {isRecording 
                                                ? (speechSupported ? 'Listening for speech...' : 'Recording (no transcription)')
                                                : 'Start recording to see live transcript here'
                                            }
                                        </p>
                                        {isRecording && speechSupported && (
                                            <p className="text-xs text-gray-400">
                                                Speak clearly into your microphone for best results
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* Transcript Controls */}
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                                <div className="text-sm text-gray-600">
                                    Words: {transcript.split(' ').filter(word => word.length > 0).length}
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setTranscript('')}
                                        disabled={!transcript}
                                        className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(transcript);
                                        }}
                                        disabled={!transcript}
                                        className="text-sm bg-blue-200 text-blue-700 px-3 py-1 rounded hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Analysis Button */}
                        <div className="text-center">
                            <button
                                onClick={analyzeInterview}
                                disabled={(!transcript.trim() && !videoBlob) || isLoading}
                                className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 font-semibold"
                            >
                                {isLoading ? 'Analyzing Interview...' : 'Analyze & Get Rating'}
                            </button>
                        </div>
                    </>
                )}

               {/* Analysis Results */}
{sessionComplete && analysis && (
    <div className="space-y-10 mt-10">

        {/* 🎉 Header */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-3xl p-8 shadow-xl">
            <div className="text-center mb-6">
                <h2 className="text-4xl font-extrabold text-gray-900 mb-2">
                    Interview Analysis Complete! 🎉
                </h2>
                <p className="text-gray-600 text-lg">
                    Here's your personalized AI-powered performance summary
                </p>
            </div>

            {/* Overall Score */}
            <div className="flex justify-center mb-4">
                <div className="text-center">
                    <div className="text-7xl font-extrabold bg-red-900 bg-clip-text text-transparent drop-shadow-sm">
                        {analysis.overallScore}/10
                    </div>
                    <p className="text-gray-700 font-medium mt-2 text-lg">Overall Score</p>
                    <p className="text-sm text-gray-500">Evaluated from your full transcript</p>
                </div>
            </div>
        </div>

        {/* ⭐ Score Breakdown */}
        <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-md">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Score Breakdown</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Each Score Card */}
                {[
                    { label: "Communication", value: analysis.communication, color: "purple" },
                    { label: "Confidence", value: analysis.confidence, color: "blue" },
                    { label: "Content Quality", value: analysis.content, color: "green" },
                    { label: "Delivery", value: analysis.delivery, color: "yellow" }
                ].map((score, i) => (
                    <div
                        key={i}
                        className={`rounded-xl p-5 border-2 shadow-sm bg-${score.color}-50 border-${score.color}-300`}
                    >
                        <h4 className="font-semibold text-gray-800 mb-2">{score.label}</h4>
                        <div
                            className={`text-4xl font-extrabold text-${score.color}-700`}
                        >
                            {score.value}/10
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* 📊 Metrics */}
        <div className="bg-gray-50 border border-gray-200 p-8 rounded-3xl shadow-sm">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Metrics Overview</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(analysis.metrics).map(([key, val], i) => (
                    <div key={i} className="bg-white rounded-xl border p-4">
                        <p className="font-semibold text-gray-700 capitalize">
                            {key.replace(/([A-Z])/g, " $1")}
                        </p>
                        <p className="text-gray-800 mt-1 text-lg">
                            {typeof val === "string" ? val : JSON.stringify(val)}
                        </p>
                    </div>
                ))}
            </div>
        </div>

        {/* 📝 Feedback */}
       {/* 🟦 Uplifted Feedback Card */}
<div className="bg-white shadow-xl rounded-3xl border border-gray-200 p-8 mt-10">
    
    <h3 className="text-2xl font-bold text-blue-900 mb-4">
        Detailed AI Feedback
    </h3>

    <div className="space-y-3 text-gray-800 leading-relaxed text-[15px]">
        {cleanFeedback(analysis.feedback)
            .split("\n")
            .map((line, i) => {

                // Bullet styling
                if (line.trim().startsWith("•")) {
                    return (
                        <div key={i} className="flex items-start space-x-2 pl-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>{line.replace("•", "").trim()}</span>
                        </div>
                    );
                }

                // Section Headings
                if (
                    line.trim().toLowerCase().includes("communication") ||
                    line.trim().toLowerCase().includes("confidence") ||
                    line.trim().toLowerCase().includes("content quality") ||
                    line.trim().toLowerCase().includes("delivery") ||
                    line.trim().toLowerCase().includes("suggestions")
                ) {
                    return (
                        <h4
                            key={i}
                            className="font-semibold text-blue-800 text-lg mt-6 border-l-4 border-blue-400 pl-3"
                        >
                            {line.trim()}
                        </h4>
                    );
                }

                // Normal paragraph
                return (
                    <p key={i} className="text-gray-700">
                        {line}
                    </p>
                );
            })}
    </div>
</div>


        {/* Date */}
        <p className="text-center text-sm text-gray-500">
            Analyzed on: {new Date(analysis.analysisDate).toLocaleString()}
        </p>

        {/* Restart Button */}
        <div className="text-center mt-8">
    <button
        onClick={startNewSession}
        className="bg-blue-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow"
    >
        Start New Interview
    </button>
</div>

    </div>
)}

            </div>
        </div>
    );
}