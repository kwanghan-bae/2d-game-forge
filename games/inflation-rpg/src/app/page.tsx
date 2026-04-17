'use client';

import dynamic from 'next/dynamic';
import { StatManager } from '@/game/StatManager';

/**
 * Phaser 엔진을 렌더링하기 위한 클라이언트 사이드 게임 컴포넌트입니다.
 * SSR(Server-Side Rendering)을 방지하기 위해 dynamic import를 사용합니다.
 */
const PhaserGame = dynamic(() => import('@/components/PhaserGame'), { ssr: false });

/**
 * 애플리케이션의 메인 진입점(홈) 페이지 컴포넌트입니다.
 * 게임 화면을 렌더링하고 Signals 기반의 React HUD를 제공합니다.
 */
export default function Home() {
  return (
    <main className="relative flex h-screen w-screen flex-col items-center justify-center bg-gray-900 overflow-hidden">
      {/* 
        React HUD (Signals):
        Adjusted for mobile with responsive padding, font size, and positioning.
      */}
      <div className="fixed top-2 left-2 sm:top-4 sm:left-4 p-2 sm:p-4 bg-black/70 text-white rounded-lg sm:rounded-xl shadow-2xl backdrop-blur-md z-50 border border-white/10 scale-90 sm:scale-100 origin-top-left">
        <div className="hidden sm:block text-[10px] uppercase tracking-widest text-gray-400 mb-1 font-bold">2026 Indie Engine Factory</div>
        <h2 className="text-sm sm:text-lg font-bold mb-1 sm:mb-3 border-b border-white/10 pb-1 sm:pb-2">Stats</h2>
        <div className="space-y-1 sm:space-y-2 font-mono text-xs sm:text-base">
          <div className="flex justify-between items-center gap-2 sm:gap-4">
            <span className="text-gray-400">HP</span>
            <span className="text-green-400 font-black">{StatManager.hp} / {StatManager.maxHp}</span>
          </div>
          <div className="flex justify-between items-center gap-2 sm:gap-4">
            <span className="text-gray-400">ATK</span>
            <span className="text-red-400 font-bold">{StatManager.attack}</span>
          </div>
          <div className="flex justify-between items-center gap-2 sm:gap-4">
            <span className="text-gray-400">DEF</span>
            <span className="text-blue-400 font-bold">{StatManager.defense}</span>
          </div>
        </div>
      </div>

      <div className="relative w-full h-full flex items-center justify-center">
        <PhaserGame />
      </div>
    </main>
  );
}
