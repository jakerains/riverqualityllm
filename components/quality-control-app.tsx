"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CircleDot, Camera, CheckCircle, XCircle, AlertCircle, Upload, HelpCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const FloatingBall = React.memo(({ delay }: { delay: number }) => (
  <div 
    className="absolute rounded-full opacity-20 blur-md"
    style={{
      width: `${Math.random() * 100 + 50}px`,
      height: `${Math.random() * 100 + 50}px`,
      backgroundColor: `rgb(${Math.floor(Math.random() * 56 + 160)}, ${Math.floor(Math.random() * 56 + 82)}, ${Math.floor(Math.random() * 56 + 45)})`,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animation: `float 20s infinite linear ${delay}s`
    }}
  />
))

const Background = React.memo(() => (
  <>
    {[...Array(10)].map((_, i) => (
      <FloatingBall key={i} delay={i * 2} />
    ))}
  </>
))

const Header = React.memo(() => (
  <header className="relative z-10 bg-white bg-opacity-50 p-4 backdrop-blur-xl shadow-md">
    <div className="container mx-auto flex items-center">
      <motion.div
        className="bg-amber-700 p-2 rounded-full mr-3"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <CircleDot className="h-6 w-6 text-amber-100" />
      </motion.div>
      <h1 className="text-2xl font-semibold text-amber-900">Rivertown Ball Company - Quality Control</h1>
    </div>
  </header>
))

interface AnalysisResult {
  status: 'pass' | 'fail' | 'no_ball' | 'quality_error';
  message: string;
}

export default function QualityControlApp() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isWebcamMode, setIsWebcamMode] = useState(true)

  useEffect(() => {
    if (isWebcamMode) {
      activateWebcam();
    }
  }, [isWebcamMode]);

  const activateWebcam = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => console.error("Error accessing the webcam", err));
    }
  };

  const switchToWebcam = () => {
    setUploadedImage(null);
    setIsWebcamMode(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        if (imageData) {
          setUploadedImage(imageData);
          setIsWebcamMode(false);
        } else {
          console.error('Failed to load image data');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (imageData: string) => {
    setIsAnalyzing(true);
    try {
      const resizedImageData = await resizeImage(imageData);
      const response = await fetch('/api/analyze-ball', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: resizedImageData }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      setResult(result);
    } catch (error) {
      console.error('Error:', error);
      setResult({ status: 'quality_error', message: 'An error occurred during analysis.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        await analyzeImage(imageDataUrl);
      }
    }
  };

  const analyzeUploadedImage = async () => {
    if (uploadedImage) {
      await analyzeImage(uploadedImage);
    }
  };

  const captureOrSwitchToWebcam = () => {
    if (isWebcamMode) {
      captureImage();
    } else {
      switchToWebcam();
    }
  };

  return (
    <div className="relative flex flex-col h-screen bg-white overflow-hidden">
      <style jsx global>{`
        @keyframes float {
          0% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, 30px) rotate(120deg); }
          66% { transform: translate(-30px, 50px) rotate(240deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }
      `}</style>
      <Background />
      <Header />
      
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold text-amber-800 mb-8">Wooden Ball Quality Control</h1>
        
        <div className="flex flex-col items-center space-y-4 w-full max-w-4xl">
          <div className="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden">
            {isWebcamMode ? (
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            ) : uploadedImage ? (
              <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-contain" />
            ) : null}
          </div>
          
          <div className="flex space-x-4">
            <Button 
              onClick={captureOrSwitchToWebcam} 
              disabled={isAnalyzing}
              className="bg-amber-700 hover:bg-amber-800 text-amber-100"
            >
              {isWebcamMode ? (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Capture and Analyze
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Webcam
                </>
              )}
            </Button>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="bg-blue-700 hover:bg-blue-800 text-blue-100"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </Button>
            
            {!isWebcamMode && uploadedImage && (
              <Button
                onClick={analyzeUploadedImage}
                disabled={isAnalyzing}
                className="bg-green-700 hover:bg-green-800 text-green-100"
              >
                Analyze Uploaded
              </Button>
            )}
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileUpload} 
          />
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 w-full max-w-2xl"
            >
              <Card className={`p-6 ${
                result.status === 'pass' ? 'bg-green-100' : 
                result.status === 'fail' ? 'bg-red-100' : 
                result.status === 'quality_error' ? 'bg-purple-100' :
                'bg-yellow-100'
              } bg-opacity-50 backdrop-blur-xl shadow-lg rounded-lg`}>
                <div className="flex flex-col">
                  <div className="flex items-center mb-4">
                    {result.status === 'pass' ? (
                      <CheckCircle className="h-8 w-8 text-green-600 mr-2" />
                    ) : result.status === 'fail' ? (
                      <XCircle className="h-8 w-8 text-red-600 mr-2" />
                    ) : result.status === 'quality_error' ? (
                      <HelpCircle className="h-8 w-8 text-purple-600 mr-2" />
                    ) : (
                      <AlertCircle className="h-8 w-8 text-yellow-600 mr-2" />
                    )}
                    <span className={`text-xl font-semibold ${
                      result.status === 'pass' ? 'text-green-800' : 
                      result.status === 'fail' ? 'text-red-800' : 
                      result.status === 'no_ball' ? 'text-yellow-800' :
                      'text-purple-800'
                    }`}>
                      {result.status === 'no_ball' ? 'No Ball Detected' : 
                       result.status === 'quality_error' ? 'Quality Check: ERROR' :
                       `Quality Check: ${result.status.toUpperCase()}`}
                    </span>
                  </div>
                  <div className="bg-white bg-opacity-50 rounded-lg p-3">
                    <p className="text-sm text-gray-800">
                      {result.message}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function resizeImage(imageData: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set the maximum dimensions
      const maxWidth = 800;
      const maxHeight = 600;
      
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);

      // Convert canvas to base64 string
      const resizedImageData = canvas.toDataURL('image/jpeg');
      resolve(resizedImageData);
    };

    img.onerror = (error) => {
      reject(new Error('Error loading image'));
    };

    img.src = imageData;
  });
}