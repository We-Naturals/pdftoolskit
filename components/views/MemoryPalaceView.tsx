'use client';

import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useFileStore } from '@/lib/stores/file-store';

// A single page in 3D space
function PagePlane({ position, index, isSelected, onClick }: { position: [number, number, number], index: number, isSelected: boolean, onClick: () => void }) {
    const mesh = useRef<THREE.Mesh>(null);
    const [hovered, setHover] = useState(false);

    useFrame((state) => {
        if (mesh.current) {
            // Floating animation
            mesh.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + index) * 0.1;
        }
    });

    return (
        <mesh
            ref={mesh}
            position={position}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            onPointerOver={() => setHover(true)}
            onPointerOut={() => setHover(false)}
        >
            <boxGeometry args={[2.1, 2.97, 0.05]} /> {/* A4 aspect ratio roughly */}
            <meshStandardMaterial color={isSelected ? '#06b6d4' : (hovered ? '#e2e8f0' : '#ffffff')} />

            {/* Page Number Text */}
            <Text
                position={[0, 0, 0.06]}
                fontSize={0.2}
                color="black"
                anchorX="center"
                anchorY="middle"
            >
                {index + 1}
            </Text>
        </mesh>
    );
}

function Scene() {
    const pages = useFileStore(state => state.pages);
    const selectedPageIds = useFileStore(state => state.selectedPageIds);
    const toggleSelection = useFileStore(state => state.toggleSelection);

    // Layout pages in a grid or circle
    const layoutPages = () => {
        const items: JSX.Element[] = [];
        const cols = 5;
        const spacingX = 2.5;
        const spacingY = 3.5;

        pages.forEach((page, i) => {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = (col - cols / 2) * spacingX;
            const y = -(row - 2) * spacingY; // Center vertically roughly

            items.push(
                <PagePlane
                    key={page.id}
                    position={[x, y, 0]}
                    index={i}
                    isSelected={selectedPageIds.has(page.id)}
                    onClick={() => toggleSelection(page.id, false)}
                />
            );
        });
        return items;
    };

    return (
        <group>
            {layoutPages()}
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
        </group>
    );
}

export function MemoryPalaceView() {
    return (
        <div className="w-full h-[600px] bg-slate-950 rounded-xl overflow-hidden shadow-2xl relative border border-slate-800">
            <div className="absolute top-4 left-4 z-10 text-white pointer-events-none">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                    Memory Palace (WebXR)
                </h2>
                <p className="text-xs text-slate-400">Spatial Document Management</p>
            </div>

            <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
                <Suspense fallback={<Html center className="text-white">Loading 3D...</Html>}>
                    <Scene />
                    <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
                    <gridHelper args={[100, 100, 0x444444, 0x222222]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -5]} />
                </Suspense>
            </Canvas>

            <div className="absolute bottom-4 right-4 z-10">
                <div className="bg-slate-900/80 backdrop-blur p-2 rounded text-xs text-slate-400 border border-white/5">
                    Left Click: Select • Right Click: Pan • Scroll: Zoom
                </div>
            </div>
        </div>
    );
}
