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
    const [interviewQuestions] = useState([
        "Tell me about yourself and your background.",
        "What are your greatest strengths?",
        "Describe a challenging situation you faced and how you handled it.",
        "Where do you see yourself in 5 years?",
        "Why do you want to work for our company?"
    ]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [sessionStarted, setSessionStarted] = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [showStopConfirm, setShowStopConfirm] = useState(false);

    const videoConstraints = {
        width: 1280,
        height: 720,
        facingMode: "user"
    };

    // Request camera permission explicitly
    const requestCameraPermission = async () => {
        try {
            setRequestingPermission(true);
            setCameraError(null);
            setError(null);
            
            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera access is not supported in this browser');
            }
            
            console.log('Requesting camera permission...');
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: videoConstraints, 
                audio: true 
            });
            
            console.log('Camera permission granted');
            
            // Permission granted, stop the stream as webcam component will handle it
            stream.getTracks().forEach(track => track.stop());
            setPermissionGranted(true);
            setIsCameraReady(true);
            
            return true;
            
        } catch (err) {
            console.error('Camera permission error:', err);
            let errorMessage = 'Camera access denied. ';
            
            if (err.name === 'NotAllowedError') {
                errorMessage += 'Please click "Allow" when your browser asks for camera permission, then try again.';
            } else if (err.name === 'NotFoundError') {
                errorMessage += 'No camera found. Please connect a camera and try again.';
            } else if (err.name === 'NotReadableError') {
                errorMessage += 'Camera is being used by another application. Please close other apps using the camera.';
            } else if (err.name === 'OverconstrainedError') {
                errorMessage += 'Camera does not support the required settings.';
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

    // Speech Recognition Functions
    const startSpeechRecognition = () => {
        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            
            if (!SpeechRecognition) {
                console.log('Speech recognition not supported in this browser');
                setSpeechSupported(false);
                return;
            }

            setSpeechSupported(true);
            const recognition = new SpeechRecognition();
            
            // Configure recognition settings
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "en-US";
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                console.log('Speech recognition started');
                setIsTranscribing(true);
            };

            recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                    } else {
                        interimTranscript += transcript;
                    }
                }

                // Update interim transcript for live display
                setInterimTranscript(interimTranscript);

                // Add final transcript to the main transcript
                if (finalTranscript) {
                    setTranscript(prev => {
                        const newTranscript = prev + finalTranscript;
                        console.log('New transcript:', newTranscript);
                        return newTranscript;
                    });
                    setInterimTranscript(''); // Clear interim when we have final
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsTranscribing(false);
                
                if (event.error === 'no-speech') {
                    console.log('No speech detected, continuing...');
                    // Don't show error for no-speech, just continue
                } else if (event.error === 'network') {
                    setError('Network error during speech recognition. Please check your connection.');
                } else if (event.error === 'not-allowed') {
                    setError('Microphone access denied. Please allow microphone access for transcription.');
                } else {
                    setError(`Speech recognition error: ${event.error}`);
                }
            };

            recognition.onend = () => {
                console.log('Speech recognition ended');
                setIsTranscribing(false);
                setInterimTranscript('');
                
                // Restart recognition if still recording
                if (isRecording) {
                    console.log('Restarting speech recognition...');
                    setTimeout(() => {
                        if (isRecording && recognitionRef.current) {
                            recognition.start();
                        }
                    }, 100);
                }
            };

            recognition.start();
            recognitionRef.current = recognition;
            
        } catch (err) {
            console.error('Failed to start speech recognition:', err);
            setError('Failed to start speech recognition: ' + err.message);
            setSpeechSupported(false);
        }
    };

    const stopSpeechRecognition = () => {
        if (recognitionRef.current) {
            console.log('Stopping speech recognition');
            recognitionRef.current.stop();
            recognitionRef.current = null;
            setIsTranscribing(false);
            setInterimTranscript('');
        }
    };

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
            
            // Start speech recognition for live transcription
            if (speechSupported) {
                startSpeechRecognition();
            } else {
                console.log('Speech recognition not supported, recording without transcription');
            }
            
        } catch (err) {
            console.error("Failed to start recording:", err);
            setError("Failed to start recording: " + err.message);
        }
    }, [webcamRef, handleDataAvailable, permissionGranted]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            console.log('Stopping recording...');
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            
            // Stop speech recognition
            stopSpeechRecognition();
        }
    }, [mediaRecorderRef, isRecording]);



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

    const analyzeInterview = async () => {
        if (!transcript.trim() && !videoBlob) {
            setError('No content to analyze. Please record an interview first.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Create FormData to send both transcript and video
            const formData = new FormData();
            formData.append('transcript', transcript);
            formData.append('userId', params.id);
            formData.append('questions', JSON.stringify(interviewQuestions));
            
            if (videoBlob) {
                formData.append('video', videoBlob, `interview-${params.id}-${Date.now()}.webm`);
            }

            const response = await fetch('/api/interview', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            const result = await response.json();
            setAnalysis(result);

            // Save to Firebase
            if (db) {
                await addDoc(collection(db, "interviews"), {
                    userId: params.id,
                    transcript,
                    analysis: result,
                    questions: interviewQuestions,
                    createdAt: serverTimestamp(),
                });
            }

            setSessionComplete(true);
        } catch (err) {
            setError('Failed to analyze interview: ' + err.message);
        } finally {
            setIsLoading(false);
        }
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
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const prevQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
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
                    <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-8 text-center">
                        <h2 className="text-gray-900 text-2xl font-semibold mb-4">Welcome to AI Interview Practice</h2>
                        <p className="text-gray-900 mb-6">
                            This session will record your video responses to common interview questions. 
                            Your performance will be analyzed and rated based on communication skills, 
                            confidence, and content quality.
                        </p>
                        <div className="bg-blue-50 p-4 rounded-lg mb-6">
                            <h3 className="font-semibold text-gray-900 mb-2">You'll be asked {interviewQuestions.length} questions:</h3>
                            <ul className="text-left text-gray-900 text-sm space-y-1">
                                {interviewQuestions.map((question, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                        <span className="text-blue-600 font-semibold">{index + 1}.</span>
                                        <span>{question}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                            <div className="flex items-center space-x-2">
                                <IconAlertCircle className="text-yellow-600" size={20} />
                                <div>
                                    <h4 className="font-semibold text-yellow-800">Camera & Microphone Access Required</h4>
                                    <p className="text-yellow-700 text-sm mb-2">
                                        This interview session requires camera and microphone access to record your responses and provide live transcription. 
                                        Please allow access when prompted by your browser.
                                    </p>
                                    <div className="flex items-center space-x-4 text-xs">
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
                        <button
                            onClick={async () => {
                                const permissionGranted = await requestCameraPermission();
                                if (permissionGranted) {
                                    setSessionStarted(true);
                                }
                            }}
                            disabled={requestingPermission}
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold flex items-center space-x-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
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
                        </div>

                        {/* Live Transcript Section */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-black text-lg font-semibold">Live Transcript</h3>
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
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-green-600 mb-2">Interview Complete!</h2>
                            <p className="text-gray-600">Here's your performance analysis:</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <h3 className="font-semibold text-blue-800">Overall Score</h3>
                                <div className="text-3xl font-bold text-blue-600 mt-2">
                                    {analysis.overallScore || 'N/A'}/10
                                </div>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <h3 className="font-semibold text-green-800">Communication</h3>
                                <div className="text-3xl font-bold text-green-600 mt-2">
                                    {analysis.communicationScore || 'N/A'}/10
                                </div>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                                <h3 className="font-semibold text-purple-800">Confidence</h3>
                                <div className="text-3xl font-bold text-purple-600 mt-2">
                                    {analysis.confidenceScore || 'N/A'}/10
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-lg mb-6">
                            <h3 className="font-semibold mb-4">Detailed Feedback</h3>
                            <div className="space-y-4">
                                {analysis.feedback ? (
                                    <div className="prose max-w-none">
                                        <p>{analysis.feedback}</p>
                                    </div>
                                ) : (
                                    <pre className="whitespace-pre-wrap text-sm">
                                        {JSON.stringify(analysis, null, 2)}
                                    </pre>
                                )}
                            </div>
                        </div>

                        <div className="text-center">
                            <button
                                onClick={startNewSession}
                                className="flex items-center space-x-2 mx-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <IconRotateClockwise size={20} />
                                <span>Start New Interview</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}