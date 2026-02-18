import React, { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import {
    calculateEAR,
    detectHeadTurn,
    detectSmile,
    LANDMARKS
} from "../../utils/faceMeshUtils";
import {
    CheckCircle2,
    AlertCircle,
    ScanFace,
    Loader2,
    Smile,
    Eye,
    MoveHorizontal
} from "lucide-react";

const ACTIONS_REQUIRED = 2;
const BLINK_THRESHOLD = 0.25;
const ACTION_TIMEOUT_MS = 10000;
const ACTION_POOL = ['blink', 'turn-left', 'turn-right', 'smile'];

/**
 * LivenessCheck Component
 *
 * Verifies user liveness by requesting random facial actions using MediaPipe Face Mesh.
 * No face recognition or identity matching is performed.
 *
 * @param {Object} props
 * @param {Function} props.onSuccess - Called when liveness is verified
 */
export default function LivenessCheck({ onSuccess }) {
    const webcamRef = useRef(null);
    const cameraRef = useRef(null);

    const [cameraPermission, setCameraPermission] = useState(true);
    const [status, setStatus] = useState("initializing");
    const [currentAction, setCurrentAction] = useState(null);
    const [message, setMessage] = useState("Initializing Face Detection...");
    const [progress, setProgress] = useState(0);

    // Use refs for values read inside the MediaPipe callback to avoid stale closures
    const statusRef = useRef("initializing");
    const currentActionRef = useRef(null);
    const actionsCompletedRef = useRef([]);
    const blinkCounter = useRef(0);
    const lastActionTime = useRef(0);
    const onSuccessRef = useRef(onSuccess);

    // Keep refs in sync with state/props
    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { currentActionRef.current = currentAction; }, [currentAction]);
    useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);

    const pickNextAction = useCallback(() => {
        const completed = actionsCompletedRef.current;

        if (completed.length >= ACTIONS_REQUIRED) {
            setStatus("success");
            statusRef.current = "success";
            setMessage("Verification Complete!");
            setTimeout(() => onSuccessRef.current(), 1000);
            return;
        }

        const remaining = ACTION_POOL.filter(a => !completed.includes(a));
        const next = remaining[Math.floor(Math.random() * remaining.length)];

        currentActionRef.current = next;
        setCurrentAction(next);
        statusRef.current = "challenge";
        setStatus("challenge");
        lastActionTime.current = Date.now();
        blinkCounter.current = 0;

        switch (next) {
            case 'blink': setMessage("Blink your eyes"); break;
            case 'turn-left': setMessage("Turn your head Left"); break;
            case 'turn-right': setMessage("Turn your head Right"); break;
            case 'smile': setMessage("Smile!"); break;
            default: setMessage("Look at the camera");
        }
    }, []);

    // This callback reads from refs only — no stale closure issues
    const onResults = useCallback((results) => {
        const currentStatus = statusRef.current;
        const action = currentActionRef.current;

        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            return;
        }

        // First face detected — start challenges
        if (currentStatus === 'initializing') {
            statusRef.current = 'ready';
            setStatus('ready');
            pickNextAction();
            return;
        }

        if (currentStatus !== 'challenge') return;

        // Timeout check
        if (Date.now() - lastActionTime.current > ACTION_TIMEOUT_MS) {
            statusRef.current = 'failed';
            setStatus('failed');
            setMessage("Timed out. Please try again.");
            return;
        }

        const landmarks = results.multiFaceLandmarks[0];
        let isActionVerified = false;

        if (action === 'blink') {
            const leftEAR = calculateEAR(landmarks, LANDMARKS.LEFT_EYE);
            const rightEAR = calculateEAR(landmarks, LANDMARKS.RIGHT_EYE);
            const avgEAR = (leftEAR + rightEAR) / 2;

            if (avgEAR < BLINK_THRESHOLD) {
                blinkCounter.current += 1;
            } else {
                if (blinkCounter.current > 1) {
                    isActionVerified = true;
                }
                blinkCounter.current = 0;
            }
        } else if (action === 'turn-left') {
            if (detectHeadTurn(landmarks) === 'left') isActionVerified = true;
        } else if (action === 'turn-right') {
            if (detectHeadTurn(landmarks) === 'right') isActionVerified = true;
        } else if (action === 'smile') {
            if (detectSmile(landmarks)) isActionVerified = true;
        }

        if (isActionVerified) {
            actionsCompletedRef.current = [...actionsCompletedRef.current, action];
            statusRef.current = 'verifying';
            setStatus('verifying');
            setMessage("Great!");
            setProgress(actionsCompletedRef.current.length * (100 / ACTIONS_REQUIRED));
            setTimeout(() => pickNextAction(), 1000);
        }
    }, [pickNextAction]);

    // Initialize MediaPipe FaceMesh once — stable because onResults/pickNextAction are stable
    useEffect(() => {
        const faceMesh = new FaceMesh({
            // Load MediaPipe assets from a local/static path instead of a third-party CDN
            locateFile: (file) =>
                `/mediapipe/face_mesh/${file}`
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
        });

        faceMesh.onResults(onResults);

        // Wait for webcam video element to be ready
        const initCamera = () => {
            if (webcamRef.current && webcamRef.current.video) {
                const camera = new Camera(webcamRef.current.video, {
                    onFrame: async () => {
                        if (webcamRef.current?.video?.readyState === 4) {
                            await faceMesh.send({ image: webcamRef.current.video });
                        }
                    },
                    width: 640,
                    height: 480
                });
                camera.start();
                cameraRef.current = camera;
            }
        };

        // Webcam may not be ready immediately — poll briefly
        let timer = setTimeout(initCamera, 500);

        return () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            if (cameraRef.current) {
                cameraRef.current.stop();
            }
            faceMesh.close();
        };
    }, [onResults]);

    const getActionIcon = () => {
        switch (currentAction) {
            case 'blink': return <Eye size={48} className="text-[var(--primary)] animate-pulse" />;
            case 'turn-left':
            case 'turn-right': return <MoveHorizontal size={48} className="text-[var(--primary)] animate-bounce" />;
            case 'smile': return <Smile size={48} className="text-[var(--primary)] animate-bounce" />;
            default: return <ScanFace size={48} className="text-[var(--primary)] animate-pulse" />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-primary)] p-4">
            <div className="w-full max-w-lg flex flex-col items-center space-y-6 animate-in fade-in duration-500">

                {/* Header */}
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black text-[var(--text-main)]">Liveness Check</h2>
                    <p className="text-[var(--text-body)] text-sm">Follow the instructions to verify you are human.</p>
                </div>

                {/* Video Container */}
                <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-[var(--bg-card)] ring-1 ring-[var(--border-color)]">
                    <Webcam
                        ref={webcamRef}
                        audio={false}
                        mirrored={true}
                        className="w-full h-full object-cover"
                        onUserMediaError={() => setCameraPermission(false)}
                    />

                    {/* Overlay UI */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                            <div
                                className="h-full bg-[var(--success)] transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {/* Challenge Prompt */}
                        {status === 'challenge' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-black/50 backdrop-blur-md p-6 rounded-3xl flex flex-col items-center gap-4 animate-in zoom-in slide-in-from-bottom-4 duration-300">
                                    {getActionIcon()}
                                    <span className="text-2xl font-bold text-white tracking-wide">{message}</span>
                                </div>
                            </div>
                        )}

                        {/* Action Confirmed */}
                        {status === 'verifying' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-[var(--success)]/90 backdrop-blur-md p-6 rounded-full animate-in zoom-in duration-300">
                                    <CheckCircle2 size={48} className="text-white" />
                                </div>
                            </div>
                        )}

                        {/* Initializing */}
                        {(status === 'initializing' || status === 'ready') && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                <div className="text-white flex flex-col items-center gap-3">
                                    <Loader2 size={32} className="animate-spin" />
                                    <span className="text-sm font-medium">Initializing Vision Models...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer / Error States */}
                <div className="w-full">
                    {status === 'failed' && (
                        <div className="p-4 bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-2xl flex flex-col items-center gap-3 text-center">
                            <div className="flex items-center gap-2 text-[var(--danger)] font-bold">
                                <AlertCircle size={20} />
                                <span>Verification Failed</span>
                            </div>
                            <p className="text-xs text-[var(--text-body)]">We could not verify your liveness. Please try again.</p>
                            <button
                                onClick={() => onFailure && onFailure()}
                                className="px-6 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm font-bold hover:bg-[var(--bg-secondary)] transition"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {!cameraPermission && (
                        <div className="p-4 bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-2xl text-center text-[var(--danger)]">
                            <p className="font-bold">Camera Access Denied</p>
                            <p className="text-xs mt-1">Please enable camera access to continue.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
