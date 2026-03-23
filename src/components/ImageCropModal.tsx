'use client'

import React, { useState, useCallback } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/Button'
import { getCroppedImg } from '@/lib/image-utils'
import { X, ZoomIn, ZoomOut, Check } from 'lucide-react'

interface ImageCropModalProps {
  image: string
  isOpen: boolean
  onClose: () => void
  onCropComplete: (croppedImage: string) => void
}

export default function ImageCropModal({
  image,
  isOpen,
  onClose,
  onCropComplete,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop)
  }

  const onCropCompleteInternal = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  const onZoomChange = (zoom: number) => {
    setZoom(zoom)
  }

  const handleSave = async () => {
    if (!croppedAreaPixels) return

    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels)
      onCropComplete(croppedImage)
      onClose()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-[80vh] max-h-[600px]"
          >
            <div className="p-6 flex items-center justify-between border-b border-white/5 shrink-0">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">裁切圖示</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Adjust your icon</p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative flex-1 bg-black/40 min-h-[300px]">
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={onCropChange}
                onCropComplete={onCropCompleteInternal}
                onZoomChange={onZoomChange}
                objectFit="contain" // 確保圖片完整顯示在容器內
                classes={{
                  containerClassName: 'bg-black/20',
                }}
              />
            </div>

            <div className="p-8 space-y-6 bg-slate-900 border-t border-white/5 shrink-0">
              <div className="flex items-center gap-4">
                <ZoomOut size={18} className="text-slate-500" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => onZoomChange(Number(e.target.value))}
                  className="flex-1 accent-primary h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <ZoomIn size={18} className="text-slate-500" />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1 py-4 rounded-2xl font-bold border border-white/5"
                  onClick={onClose}
                >
                  取消
                </Button>
                <Button
                  className="flex-1 py-4 rounded-2xl font-black tracking-tight flex items-center justify-center gap-2"
                  onClick={handleSave}
                >
                  <Check size={18} />
                  完成裁切
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
