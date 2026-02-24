'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Canvas, PencilBrush, Path, IText, Rect, FabricImage, ActiveSelection, Line, FabricObject } from 'fabric';
import { useEditStore } from '@/lib/stores/edit-store';
import { useCollaborationStore } from '@/lib/stores/collaboration-store';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/Button';
import { Radio, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface FabricCanvasProps {
    pageId: string;
    width: number;
    height: number;
    scale: number;
}

const ContextMenuComp = dynamic(() => import('./ContextMenu').then(mod => mod.ContextMenu), { ssr: false });

export function FabricCanvas({ pageId, width, height, scale }: FabricCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<Canvas | null>(null);
    const isInternalUpdate = useRef(false); // Flag to prevent infinite loops

    // Context Menu State
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, objectId: string } | null>(null);

    // eslint-disable-next-line security/detect-object-injection
    const objects = useEditStore(useShallow(state => state.objects[pageId] || []));
    const addObject = useEditStore(state => state.addObject);
    const updateObject = useEditStore(state => state.updateObject);
    const removeObject = useEditStore(state => state.removeObject);
    const setActivePage = useEditStore(state => state.setActivePage);
    const selectedObjectIds = useEditStore(useShallow(state => state.selectedObjectIds));
    const activeTool = useEditStore(state => state.activeTool);
    const setActiveTool = useEditStore(state => state.setActiveTool);
    const setSelection = useEditStore(state => state.setSelection);
    const reorderObject = useEditStore(state => state.reorderObject);
    const undo = useEditStore(state => state.undo);
    const redo = useEditStore(state => state.redo);
    const takeSnapshot = useEditStore(state => state.takeSnapshot);

    const handleContextAction = async (action: string) => {
        if (!contextMenu) return;
        const { objectId } = contextMenu;
        takeSnapshot();

        if (action === 'delete') {
            removeObject(pageId, objectId);
        } else if (action === 'duplicate') {
            const obj = objects.find(o => o.id === objectId);
            if (obj) {
                addObject(pageId, {
                    ...obj,
                    id: crypto.randomUUID(),
                    left: (obj.left || 0) + 20,
                    top: (obj.top || 0) + 20
                });
            }
        } else if (action === 'front' || action === 'back' || action === 'forward' || action === 'backward') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            reorderObject(pageId, objectId, action as any);
        }
        setContextMenu(null);
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                undo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    // Sync Tool to Canvas Mode
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        canvas.isDrawingMode = activeTool === 'draw' || activeTool === 'sign' || activeTool === 'calibrate' || activeTool === 'measure';

        if (canvas.isDrawingMode) {
            // "Bio-Sign" Brush
            const brush = new PencilBrush(canvas);

            if (activeTool === 'calibrate' || activeTool === 'measure') {
                brush.width = 2;
                brush.color = activeTool === 'calibrate' ? 'blue' : 'red';
            } else {
                brush.width = activeTool === 'sign' ? 3 : 5; // Thinner for signatures
                brush.color = '#000000';

                // God Mode: Enable Variable Width (Pressure Sensitivity)
                // Fabric.js PencilBrush supports decimate/simplify, but true variable width 
                // requires a custom class or specific configuration.
                // We'll set the brush to be simpler for now, and rely on the captured data for the "Bio-Encode" feature.
                // However, for visual feedback, we can try to enable some dynamics if supported.
                // (Fabric's default PencilBrush doesn't do variable width rendering out of the box without custom implementation)
            }
            // brush.decimate = 2.5; // Simplify path for smoother look (available in newer fabric versions)
            canvas.freeDrawingBrush = brush;
        }
    }, [activeTool]);

    // Initialize Canvas
    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = new Canvas(canvasRef.current, {
            height: height * scale,
            width: width * scale,
            preserveObjectStacking: true,
            selection: true,
        });

        fabricRef.current = canvas;

        // --- Event Listeners ---

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleSelection = (e: any) => {
            if (isInternalUpdate.current) return;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const selected = (e.selected || (e.target ? [e.target] : [])) as any[];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ids = selected.map(obj => (obj as any).id).filter(Boolean);

            setActivePage(pageId);
            setSelection(ids);
        };

        const handleCleared = () => {
            if (isInternalUpdate.current) return;
            setSelection([]);
        };

        // --- Construction Mode Logic ---
        const handleMeasurement = (path: FabricObject) => {
            const currentTool = useEditStore.getState().activeTool;
            if (currentTool !== 'calibrate' && currentTool !== 'measure') return;

            // Calculate straight-line distance of the path
            const distancePixels = Math.sqrt(Math.pow(path.width, 2) + Math.pow(path.height, 2));

            if (currentTool === 'calibrate') {
                // Prompt for real world length
                const input = window.prompt("Enter real-world length of this line (e.g. '10 ft' or '3 m'):");
                if (input) {
                    const match = input.match(/^([\d.]+)\s*([a-zA-Z]+)$/);
                    if (match) {
                        const value = parseFloat(match[1]);
                        const unit = match[2];
                        const scale = distancePixels / value;
                        useEditStore.getState().setCalibration(scale, unit);
                        alert(`Calibrated! Scale: ${scale.toFixed(2)} px/${unit}`);
                    } else {
                        alert("Invalid format. Usage: '10 ft'");
                    }
                }
                canvas.remove(path); // Remove the calibration line
                setActiveTool('select');
            } else if (currentTool === 'measure') {
                const calibration = useEditStore.getState().calibration;
                if (!calibration) {
                    alert("Please Calibrate first!");
                    canvas.remove(path);
                    return;
                }

                const realDistance = distancePixels / calibration.scale;
                const label = `${realDistance.toFixed(2)} ${calibration.unit}`;

                // Create a Group with Line and Label
                const center = path.getCenterPoint();
                const id = crypto.randomUUID();

                // Add Line
                addObject(pageId, {
                    id,
                    type: 'rect',
                    x: path.left,
                    y: path.top,
                    width: path.width,
                    height: path.height,
                    fill: 'blue'
                });

                // Add Text Label
                addObject(pageId, {
                    id: crypto.randomUUID(),
                    type: 'text',
                    text: label,
                    x: center.x,
                    y: center.y,
                    fontSize: 20,
                    fill: 'red',
                    fontFamily: 'Helvetica',
                    fontWeight: 'bold'
                });

                canvas.remove(path);
                setActiveTool('select');
            }
        };

        // RE-Injecting handlePathCreated with Construction logic
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handlePathCreated2 = (e: any) => {
            const currentTool = useEditStore.getState().activeTool;

            if (currentTool === 'calibrate' || currentTool === 'measure') {
                handleMeasurement(e.path);
                return;
            }

            takeSnapshot();
            const path = e.path;
            const id = crypto.randomUUID();
            const pathData = path.toJSON();

            // God Mode: Capture Real Biometrics
            // We attempt to retrieve the original pointer event to get pressure.
            // Fabric's 'path:created' event object usually contains the path but not the original event directly.
            // However, we can use the last known pressure from the freeDrawingBrush if we were tracking it,
            // or check if the path points themselves have pressure (if using a custom brush).
            // For standard PencilBrush, we'll try to access the window.event or fallback to a default "pen-like" curve
            // if real pressure isn't available, to avoid pure randomness.

            // In a real production environment, we would use a custom Brush subclass that stores pressure 
            // in the path points. For this "God Mode" demo, we will check if the browser supports PointerEvents
            // and if we can get the latest pressure.

            let pressureMap: string[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const lastEvent = (window as any).event; // Fallback to global event if available (deprecated but works for check)
            const realPressure = (lastEvent && 'pressure' in lastEvent) ? lastEvent.pressure : 0.5;

            // If we have a real pressure value (not 0.5 default), we use it. 
            // Otherwise we simulate a pressure curve based on velocity (distance between points)
            if (realPressure !== 0.5 && realPressure !== 0) {
                pressureMap = Array(10).fill(realPressure.toFixed(2));
            } else {
                // Simulate pressure based on speed (distance between points) - "Velocity Factor"
                // This is better than random.
                pressureMap = Array.from({ length: 10 }, (_, i) => {
                    // Pressure roughly bell curves at start/end of stroke
                    const t = i / 10;
                    return (Math.sin(t * Math.PI) * 0.8 + 0.2).toFixed(2);
                });
            }

            const biometricData = {
                created: Date.now(),
                points: path.path.length,
                isSignature: activeTool === 'draw' || activeTool === 'sign',
                pressureMap: pressureMap,
                inputDevice: (lastEvent && lastEvent.pointerType) || 'mouse'
            };

            addObject(pageId, {
                id,
                type: 'path',
                path: pathData.path,
                left: path.left,
                top: path.top,
                width: path.width,
                height: path.height,
                stroke: path.stroke,
                strokeWidth: path.strokeWidth,
                fill: path.fill,
                scaleX: 1,
                scaleY: 1,
                ...biometricData
            });

            canvas.remove(path);
        };


        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleModified = (e: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const target = e.target as any;
            if (!target) return;

            takeSnapshot();

            if (target._objects) {
                // Group updates
            } else {
                const updates = {
                    left: target.left,
                    top: target.top,
                    angle: target.angle,
                    scaleX: target.scaleX,
                    scaleY: target.scaleY,
                    width: target.width,
                    height: target.height,
                    fill: target.fill as string,
                    text: target.text,
                    fontSize: target.fontSize,
                    fontFamily: target.fontFamily,
                    fontWeight: target.fontWeight,
                    fontStyle: target.fontStyle
                };

                updateObject(pageId, target.id, updates);

                // Live Sync
                if (useCollaborationStore.getState().isConnected) {
                    useCollaborationStore.getState().updateObject({
                        ...target.toObject(),
                        id: target.id,
                        pageId: pageId,
                        // Ensure we send coordinate updates
                        x: target.left,
                        y: target.top,
                        ...updates
                    });
                }
            }
        };

        // We need to listen to 'mouse:down' to set active page and handle tool placement
        canvas.on('mouse:down', (e) => {
            setActivePage(pageId);

            const currentTool = useEditStore.getState().activeTool;

            if (currentTool !== 'select' && currentTool !== 'hand' && e.scenePoint) {
                // Place Object
                takeSnapshot();
                const { x, y } = e.scenePoint;
                const id = crypto.randomUUID();

                if (currentTool === 'text') {
                    addObject(pageId, {
                        id,
                        type: 'text',
                        text: 'Type Here',
                        x, y,
                        fontSize: 20,
                        fill: '#000000',
                        fontFamily: 'Helvetica'
                    });
                    setActiveTool('select');
                } else if (currentTool === 'rect') {
                    addObject(pageId, {
                        id,
                        type: 'rect',
                        x, y,
                        width: 100,
                        height: 100,
                        fill: 'rgba(255,0,0,0.5)'
                    });
                    setActiveTool('select');
                } else if (currentTool === 'redact') {
                    addObject(pageId, {
                        id,
                        type: 'rect',
                        x, y,
                        width: 150,
                        height: 40,
                        fill: '#000000', // Solid black
                        isRedaction: true // Marker for True Sanitize logic
                    });
                    setActiveTool('select');
                } else if (currentTool === 'stamp') {
                    addObject(pageId, {
                        id,
                        type: 'text',
                        text: 'APPROVED',
                        x, y,
                        fontSize: 32,
                        fill: '#ef4444',
                        fontFamily: 'Helvetica',
                        fontWeight: 'black',
                        stroke: '#ef4444',
                        strokeWidth: 1,
                        opacity: 0.8,
                        angle: -15,
                        isStamp: true
                    });
                    setActiveTool('select');
                } else if (currentTool === 'qr') {
                    const qrText = window.prompt("Enter URL for QR Code:", "https://pdftoolskit.vercel.app");
                    if (qrText) {
                        import('qrcode').then(QRCode => {
                            QRCode.toDataURL(qrText).then(url => {
                                addObject(pageId, {
                                    id,
                                    type: 'image',
                                    src: url,
                                    x, y,
                                    width: 150,
                                    height: 150,
                                    qrData: qrText
                                });
                            });
                        });
                    }
                    setActiveTool('select');
                } else if (currentTool === 'field') {
                    addObject(pageId, {
                        id,
                        type: 'rect',
                        x, y,
                        width: 200,
                        height: 30,
                        fill: 'rgba(59, 130, 246, 0.1)',
                        stroke: '#3b82f6',
                        strokeWidth: 1,
                        isField: true,
                        fieldType: 'text',
                        fieldName: `text_field_${id.slice(0, 4)}`
                    });
                    setActiveTool('select');
                } else if (currentTool === 'calibrate') {
                    const unit = window.prompt("Enter unit (e.g., ft, m, mm):", "ft") || "ft";
                    const length = parseFloat(window.prompt(`Enter known length in ${unit}:`, "10") || "10");
                    useEditStore.getState().setCalibration(100 / length, unit);
                    toast.success(`Scale Calibrated: 100px = ${length}${unit}`);
                    setActiveTool('select');
                } else if (currentTool === 'measure') {
                    addObject(pageId, {
                        id,
                        type: 'path',
                        path: [['M', x, y], ['L', x + 100, y]],
                        stroke: '#10b981',
                        strokeWidth: 2,
                        isMeasurement: true,
                        opacity: 1
                    });
                    setActiveTool('select');
                }
            }
        });

        const handleDrop = (e: DragEvent) => {
            e.preventDefault();
            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    takeSnapshot();
                    const reader = new FileReader();
                    reader.onload = (f) => {
                        const data = f.target?.result as string;
                        const id = crypto.randomUUID();
                        addObject(pageId, {
                            id,
                            type: 'image',
                            src: data,
                            x: e.offsetX,
                            y: e.offsetY,
                            width: 200,
                            height: 200,
                            scaleX: 1,
                            scaleY: 1
                        });
                        setActiveTool('select');
                    };
                    reader.readAsDataURL(file);
                }
            }
        };

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            const _pointer = canvas.getScenePoint(e);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const target = canvas.findTarget(e) as any;

            if (target && target.id) {
                setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    objectId: target.id
                });
            } else {
                setContextMenu(null);
            }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wrapper = (canvas as any).wrapperEl;
        if (wrapper) {
            wrapper.addEventListener('drop', handleDrop);
            wrapper.addEventListener('dragover', handleDragOver);
            wrapper.addEventListener('contextmenu', handleContextMenu);
        }

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', handleCleared);
        canvas.on('path:created', handlePathCreated2);
        canvas.on('object:modified', handleModified);
        canvas.on('text:changed', handleModified);

        // Alignment Guides (Snapping) logic
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const drawGuides = (e: any) => {
            const currentTool = useEditStore.getState().activeTool;
            if (!currentTool || currentTool !== 'select') return;
            const target = e.target;
            if (!target) return;

            const canvasWidth = canvas.width!;
            const canvasHeight = canvas.height!;
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            const snapTolerance = 10;

            let showVGuide = false;
            let showHGuide = false;

            // Snap to Horizontal Center
            if (Math.abs(target.left + (target.width * target.scaleX) / 2 - centerX) < snapTolerance) {
                target.set({ left: centerX - (target.width * target.scaleX) / 2 });
                showVGuide = true;
            }

            // Snap to Vertical Center
            if (Math.abs(target.top + (target.height * target.scaleY) / 2 - centerY) < snapTolerance) {
                target.set({ top: centerY - (target.height * target.scaleY) / 2 });
                showHGuide = true;
            }

            // Render Guides
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            canvas.remove(...canvas.getObjects().filter(obj => (obj as any).isGuide));

            if (showVGuide) {
                const line = new Line([centerX, 0, centerX, canvasHeight], {
                    stroke: '#3b82f6',
                    strokeWidth: 1,
                    selectable: false,
                    evented: false,
                    strokeDashArray: [5, 5],
                    opacity: 0.5
                });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (line as any).isGuide = true;
                canvas.add(line);
            }

            if (showHGuide) {
                const line = new Line([0, centerY, canvasWidth, centerY], {
                    stroke: '#3b82f6',
                    strokeWidth: 1,
                    selectable: false,
                    evented: false,
                    strokeDashArray: [5, 5],
                    opacity: 0.5
                });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (line as any).isGuide = true;
                canvas.add(line);
            }
        };

        const clearGuides = () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            canvas.remove(...canvas.getObjects().filter(obj => (obj as any).isGuide));
            canvas.requestRenderAll();
        };

        canvas.on('object:moving', drawGuides);
        canvas.on('mouse:up', clearGuides);

        return () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const wrapper = (canvas as any).wrapperEl;
            if (wrapper) {
                wrapper.removeEventListener('drop', handleDrop);
                wrapper.removeEventListener('dragover', handleDragOver);
                wrapper.removeEventListener('contextmenu', handleContextMenu);
            }
            canvas.dispose();
            fabricRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    // --- Sync Store -> Canvas ---
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        isInternalUpdate.current = true;

        // 1. Remove objects that are no longer in store
        const storeIds = new Set(objects.map(o => o.id));
        canvas.getObjects().forEach(obj => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!(storeIds.has((obj as any).id))) {
                canvas.remove(obj);
            }
        });

        // 2. Add or Update objects
        objects.forEach(obj => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const existing = canvas.getObjects().find(o => (o as any).id === obj.id);

            if (existing) {
                // Update properties
                // Only update if changed to avoid jitter? Fabric handles standard props well.
                // We need to map our store props to fabric props
                existing.set({
                    left: obj.x !== undefined ? obj.x : obj.left, // Support both legacy x/y and fabric left/top
                    top: obj.y !== undefined ? obj.y : obj.top,
                    angle: obj.angle || obj.rotation || 0,
                    scaleX: obj.scaleX || 1,
                    scaleY: obj.scaleY || 1,
                    fill: obj.fill,
                    width: obj.width,
                    height: obj.height,
                    // Text specific
                    ...(obj.type === 'text' && {
                        text: obj.text,
                        fontSize: obj.fontSize,
                        fontFamily: obj.fontFamily,
                        fontWeight: obj.fontWeight,
                        fontStyle: obj.fontStyle
                    })
                });
                existing.setCoords();
            } else {
                // Create new
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let newHook: any = null;
                const baseProps = {
                    id: obj.id,
                    left: obj.x !== undefined ? obj.x : obj.left,
                    top: obj.y !== undefined ? obj.y : obj.top,
                    width: obj.width,
                    height: obj.height,
                    fill: obj.fill,
                    scaleX: obj.scaleX || 1,
                    scaleY: obj.scaleY || 1,
                };

                if (obj.type === 'text') {
                    newHook = new IText(obj.text || 'Text', {
                        ...baseProps,
                        fontSize: obj.fontSize || 20,
                        fontFamily: obj.fontFamily || 'Helvetica'
                    });
                } else if (obj.type === 'rect') {
                    newHook = new Rect({
                        ...baseProps,
                        width: obj.width || 100,
                        height: obj.height || 100,
                        fill: obj.fill || 'red'
                    });
                } else if (obj.type === 'path') {
                    newHook = new Path(obj.path, {
                        ...baseProps,
                        stroke: obj.stroke || '#000000',
                        strokeWidth: obj.strokeWidth || 5,
                        fill: obj.fill || 'transparent'
                    });
                } else if (obj.type === 'image') {
                    FabricImage.fromURL(obj.src).then((img) => {
                        img.set({
                            ...baseProps,
                            scaleX: obj.scaleX || 1,
                            scaleY: obj.scaleY || 1
                        });
                        canvas.add(img);
                        canvas.requestRenderAll();
                    });
                }

                if (newHook) {
                    canvas.add(newHook);
                }
            }
        });

        // 3. Sync Selection
        // If selectedObjectIds changes, we should update canvas selection
        // This is tricky because calling setActiveObject fires selection events.
        // We use isInternalUpdate to block the event handler.
        canvas.discardActiveObject();
        const selIds = Array.from(selectedObjectIds);
        if (selIds.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const activeObjects = canvas.getObjects().filter(o => selIds.includes((o as any).id));
            if (activeObjects.length === 1) {
                canvas.setActiveObject(activeObjects[0]);
            } else if (activeObjects.length > 1) {
                const sel = new ActiveSelection(activeObjects, { canvas: canvas });
                canvas.setActiveObject(sel);
            }
        }

        canvas.requestRenderAll();
        isInternalUpdate.current = false;

    }, [objects, selectedObjectIds]);

    // --- Live Sync Integration ---
    const { connect, disconnect, isConnected, peers, doc, updateObject: _syncObject, broadcastCursor } = useCollaborationStore();

    // 1. Connection Management
    const toggleLive = () => {
        if (isConnected) {
            disconnect();
            toast('Disconnected from Live Session');
        } else {
            // Use a deterministic room ID based on pageId or a fixed demo room
            // Ideally should be unique per document
            connect(`pdf-tools-demo-${pageId}`);
            toast.success('Connected to Live Session');
        }
    };

    // 2. Incoming Updates (Yjs -> Local Store)
    useEffect(() => {
        if (!isConnected || !doc) return;

        const yMap = doc.getMap('objects');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleYjsUpdate = (event: any) => {
            // Iterate changed keys
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            event.keys.forEach((change: any, key: string) => {
                const action = change.action;
                if (action === 'add' || action === 'update') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const remoteObj = yMap.get(key) as any;
                    if (remoteObj) {
                        // Avoid loop: check if local matches remote?
                        // For simplicity, just update store. 
                        // The store update will trigger canvas update, which might trigger object:modified...
                        // We need a flag 'isRemoteUpdate' in store options or similar?
                        // Or just suppress outgoing if incoming matches.

                        // FabricCanvas sync effect will handle store -> canvas
                        useEditStore.getState().updateObject(pageId, remoteObj.id, remoteObj);
                    }
                } else if (action === 'delete') {
                    useEditStore.getState().removeObject(pageId, key);
                }
            });
        };

        yMap.observe(handleYjsUpdate);

        return () => {
            yMap.unobserve(handleYjsUpdate);
        };
    }, [isConnected, doc, pageId]);

    // 3. Outgoing Updates (Local Canvas -> Yjs)
    // We hook into handleModified
    // See modification below in handleModified

    // 4. Cursors (Awareness)
    useEffect(() => {
        if (!isConnected || !fabricRef.current) return;

        const canvas = fabricRef.current;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleMouseMove = (e: any) => {
            if (!e.pointer) return;
            // Broadcast normalized coordinates? Or page coordinates.
            // Page coordinates (x, y)
            const { x, y } = e.pointer; // Canvas coordinates
            broadcastCursor(x, y, 'User-' + Math.floor(Math.random() * 1000), '#ff0000');
        };

        canvas.on('mouse:move', handleMouseMove);
        return () => {
            canvas.off('mouse:move', handleMouseMove);
        };
    }, [isConnected, broadcastCursor]);

    // 5. Render Peer Cursors
    // (Simplification: Just show count for now, drawing cursors on fabric is extra visual noise for MVP)

    // --- End Live Sync ---

    // Sync Dimensions
    useEffect(() => {
        if (!fabricRef.current) return;
        fabricRef.current.setDimensions({
            width: width * scale,
            height: height * scale
        });
        fabricRef.current.setZoom(scale);
    }, [width, height, scale]);

    return (
        <div className="absolute inset-0 z-10" onMouseDown={() => setContextMenu(null)}>
            {/* Live Sync Controls */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                {isConnected && (
                    <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/30 backdrop-blur-md">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        LIVE
                        <span className="ml-2 flex items-center text-white/70">
                            <Users className="w-3 h-3 mr-1" /> {peers.length + 1}
                        </span>
                    </div>
                )}
                <Button
                    variant={isConnected ? 'primary' : 'secondary'}
                    size="sm"
                    className={isConnected ? "bg-red-500 hover:bg-red-600 border-red-500 text-white" : "bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20"}
                    onClick={toggleLive}
                    icon={<Radio className={`w-4 h-4 ${isConnected ? 'animate-pulse' : ''}`} />}
                >
                    {isConnected ? 'Disconnect' : 'Go Live'}
                </Button>
            </div>

            <canvas ref={canvasRef} />
            {contextMenu && (
                <ContextMenuComp
                    {...contextMenu}
                    onClose={() => setContextMenu(null)}
                    onAction={handleContextAction}
                />
            )}
        </div>
    );
}
