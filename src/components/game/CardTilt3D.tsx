"use client";

/* eslint-disable react-hooks/refs --
 * This whole file is an R3F/three.js scene — reading a ref to feed a JSX
 * prop (e.g. `map={glareTexture}` below, sourced from a lazily-initialized
 * ref) is the normal way to hand three.js objects to R3F, not a React
 * anti-pattern. `"use no memo"` below opts the component out of the Babel
 * compiler's transform for a related reason, but that directive doesn't
 * affect this separate static lint rule, hence disabling it here too.
 */

import { Canvas, useFrame, useLoader, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import { CARD_HEIGHT, CARD_WIDTH } from "@/lib/game/constants";

const MAX_TILT = 0.22;
const EASE = 0.1;

const PLANE_HEIGHT = 2.6;
const PLANE_WIDTH = PLANE_HEIGHT * (CARD_WIDTH / CARD_HEIGHT);

const GLARE_CANVAS_SIZE = 256;

function TiltPlane({
	imageUrl,
	pointerRef,
}: {
	imageUrl: string;
	pointerRef: React.RefObject<{ x: number; y: number }>;
}) {
	"use no memo";

	const meshRef = useRef<THREE.Mesh>(null);

	const texture = useLoader(THREE.TextureLoader, imageUrl);

	const glareRef = useRef<{ canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } | null>(null);
	if (!glareRef.current) {
		const canvas = document.createElement("canvas");
		canvas.width = GLARE_CANVAS_SIZE;
		canvas.height = GLARE_CANVAS_SIZE;
		glareRef.current = { canvas, texture: new THREE.CanvasTexture(canvas) };
	}
	const { canvas: glareCanvas, texture: glareTexture } = glareRef.current;

	function paintGlare(uv: THREE.Vector2 | null) {
		const ctx = glareCanvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, glareCanvas.width, glareCanvas.height);
		if (uv) {
			ctx.save();
			ctx.beginPath();
			ctx.roundRect(0, 0, glareCanvas.width, glareCanvas.height, glareCanvas.width * 0.06);
			ctx.clip();

			const x = uv.x * glareCanvas.width;
			const y = (1 - uv.y) * glareCanvas.height;
			const gradient = ctx.createRadialGradient(x, y, 0, x, y, glareCanvas.width * 0.75);
			gradient.addColorStop(0, "rgba(255, 255, 255, 0.20)");
			gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, glareCanvas.width, glareCanvas.height);
			ctx.restore();
		}
		glareTexture.needsUpdate = true;
	}

	useFrame(() => {
		const mesh = meshRef.current;
		if (!mesh) return;

		const targetY = pointerRef.current.x * MAX_TILT;
		const targetX = -pointerRef.current.y * MAX_TILT;
		mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, targetY, EASE);
		mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, targetX, EASE);
	});

	function handleSurfaceMove(e: ThreeEvent<PointerEvent>) {
		if (!e.uv) return;
		pointerRef.current = { x: e.uv.x * 2 - 1, y: (1 - e.uv.y) * 2 - 1 };
		paintGlare(e.uv);
	}

	function handleSurfaceLeave() {
		pointerRef.current = { x: 0, y: 0 };
		paintGlare(null);
	}

	return (
		<mesh ref={meshRef} onPointerMove={handleSurfaceMove} onPointerLeave={handleSurfaceLeave}>
			<planeGeometry args={[PLANE_WIDTH, PLANE_HEIGHT]} />

			<meshBasicMaterial map={texture} transparent toneMapped={false} />

			<mesh position={[0, 0, 0.01]}>
				<planeGeometry args={[PLANE_WIDTH, PLANE_HEIGHT]} />
				<meshBasicMaterial
					map={glareTexture}
					transparent
					blending={THREE.AdditiveBlending}
					depthWrite={false}
					toneMapped={false}
				/>
			</mesh>
		</mesh>
	);
}

export function CardTilt3D({ imageUrl, alt }: { imageUrl: string; alt: string }) {
	const pointerRef = useRef({ x: 0, y: 0 });

	return (
		<div
			role="img"
			aria-label={alt}
			className="aspect-[5/7] h-[85vh] max-h-[700px] overflow-hidden rounded-sm"
		>
			<Canvas camera={{ position: [0, 0, 4], fov: 45 }} gl={{ alpha: true }}>
				<Suspense fallback={null}>
					<TiltPlane imageUrl={imageUrl} pointerRef={pointerRef} />
				</Suspense>
			</Canvas>
		</div>
	);
}
