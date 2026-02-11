"use client";

import {
  PixelPlanet,
  PixelPlanetProps,
} from "@/components/pixel-planet/pixel-planet";
import { useState } from "react";

const PLANET_TYPES: PixelPlanetProps["type"][] = [
  "earth",
  "ice",
  "gas_giant_1",
  "gas_giant_2",
  "asteroid",
  "star",
  "lava",
  "dry",
  "no_atmosphere",
];

export function PlanetDemoPage() {
  const [seed, setSeed] = useState(1);

  const randomizeAll = () => {
    setSeed(Math.random());
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center bg-gray-900/50 p-6 rounded-xl backdrop-blur-sm border border-gray-800">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
              Pixel Planets
            </h1>
            <p className="text-gray-400 mt-2">
              Procedurally generated planets using React Three Fiber and
              shaders.
            </p>
          </div>
          <button
            onClick={randomizeAll}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/20"
          >
            Randomize
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PLANET_TYPES.map((type) => (
            <div
              key={type}
              className="group bg-gray-900/30 rounded-xl overflow-hidden border border-gray-800 hover:border-gray-600 transition-colors"
            >
              <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                <h3 className="font-mono text-lg font-semibold capitalize text-gray-200">
                  {type.replace(/_/g, " ")}
                </h3>
              </div>
              <div className="h-[300px] relative bg-black/50">
                <PixelPlanet type={type} seed={seed} />
                <div className="absolute bottom-2 right-2 text-xs font-mono text-gray-600 bg-black/80 px-2 py-1 rounded">
                  Seed: {seed.toFixed(4)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
