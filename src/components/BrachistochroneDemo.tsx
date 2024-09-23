import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, AnimatePresence } from 'framer-motion'
import InstructionsPage from './InstructionsPage'
// Remove or comment out this import if not used
// import AboutMeModal from './AboutMeModal'

// Define a type for the curve data
type CurveData = {
  func: (t: number) => number[];
  color: string;
  time: number;
};

// Define the type for the curves object
type CurvesType = {
  [key: string]: CurveData;
};

interface AboutMeModalProps {
  onClose: () => void;
  name: string;
  email: string;
}

const BrachistochroneDemo: React.FC = () => {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null)
  const [animationState, setAnimationState] = useState<'idle' | 'running' | 'paused'>('idle')
  const [animationSpeed, setAnimationSpeed] = useState(0.5)
  const [cycloidParameter, setCycloidParameter] = useState(0.2)
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, string>>({})
  const [rankings, setRankings] = useState<string[]>([])
  const [prevRankings, setPrevRankings] = useState<string[]>([])
  const startTimeRef = useRef<number | null>(null)
  const [isAnimationComplete, setIsAnimationComplete] = useState(false)
  const [pausedElapsedTime, setPausedElapsedTime] = useState(0)
  const lastTimestampRef = useRef<number | null>(null)
  const [distanceToEnd, setDistanceToEnd] = useState<Record<string, number>>({})
  const [showInstructions, setShowInstructions] = useState(false)
  const [showAboutMe, setShowAboutMe] = useState(false)

  // Assert the type of curves
  const curves = useMemo(() => ({
    'Brachistochrone': {
      func: (t: number) => {
        const theta = t * Math.PI
        return [(theta - Math.sin(theta)) / Math.PI, (1 - Math.cos(theta)) / 2]
      },
      color: '#3b82f6',
      time: 2.0
    },
    'Straight Line': {
      func: (t: number) => [t, t],
      color: '#ef4444',
      time: 2.5
    },
    'Parabola': {
      func: (t: number) => [t, t * (2 - t)],
      color: '#8b5cf6',
      time: 2.1
    },
    'Parametric Cycloid': {
      func: (t: number) => {
        return [
          t - Math.sin(Math.PI * t) / Math.PI,
          (1 - Math.cos(Math.PI * t)) / 2 + cycloidParameter * Math.pow(Math.sin(Math.PI * t), 2)
        ]
      },
      color: '#f59e0b',
      time: 2.0 * (1 + cycloidParameter)
    }
  }), [cycloidParameter]) as CurvesType

  useEffect(() => {
    const mainCanvas = mainCanvasRef.current
    if (!mainCanvas) return

    const ctx = mainCanvas.getContext('2d')
    if (!ctx) return

    const width = mainCanvas.width
    const height = mainCanvas.height
    const margin = { top: 50, right: 50, bottom: 70, left: 70 }
    const graphWidth = width - margin.left - margin.right
    const graphHeight = height - margin.top - margin.bottom

    let animationFrameId: number

    const drawStaticElements = () => {
      // Clear the canvas
      ctx.clearRect(0, 0, width, height)

      // Draw background
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(0, 0, width, height)

      // Draw grid
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 1
      for (let x = 0; x <= graphWidth; x += graphWidth / 10) {
        ctx.beginPath()
        ctx.moveTo(margin.left + x, margin.top)
        ctx.lineTo(margin.left + x, height - margin.bottom)
        ctx.stroke()
      }
      for (let y = 0; y <= graphHeight; y += graphHeight / 10) {
        ctx.beginPath()
        ctx.moveTo(margin.left, margin.top + y)
        ctx.lineTo(width - margin.right, margin.top + y)
        ctx.stroke()
      }

      // Draw axes
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(margin.left, margin.top)
      ctx.lineTo(margin.left, height - margin.bottom)
      ctx.lineTo(width - margin.right, height - margin.bottom)
      ctx.stroke()

      // Draw axis labels with improved styling
      ctx.fillStyle = '#1e293b'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText('Time', width / 2, height - margin.bottom / 2)

      // Rotate and position the Height label
      ctx.save()
      ctx.translate(margin.left / 2, height / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText('Height', 0, 0)
      ctx.restore()

      // Draw curves
      Object.entries(curves).forEach(([label, curve]) => {
        ctx.beginPath()
        ctx.strokeStyle = curve.color
        ctx.lineWidth = 2
        for (let t = 0; t <= 1; t += 0.01) {
          const [x, y] = curve.func(t)
          ctx.lineTo(margin.left + x * graphWidth, margin.top + y * graphHeight)
        }
        ctx.stroke()
      })

      // Draw starting balls only if animation is not running
      if (animationState !== 'running') {
        Object.entries(curves).forEach(([label, curve]) => {
          const [x, y] = curve.func(0)
          ctx.beginPath()
          ctx.arc(margin.left + x * graphWidth, margin.top + y * graphHeight, 8, 0, 2 * Math.PI)
          ctx.fillStyle = curve.color
          ctx.fill()
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.stroke()
        })
      }
    }

    // Draw static elements initially
    drawStaticElements()

    const drawFrame = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
        lastTimestampRef.current = timestamp;
      }

      let elapsedTime;
      if (animationState === 'running') {
        const deltaTime = timestamp - (lastTimestampRef.current || timestamp);
        elapsedTime = pausedElapsedTime + deltaTime / 1000 * animationSpeed;
        lastTimestampRef.current = timestamp;
      } else {
        elapsedTime = pausedElapsedTime;
      }

      // Clear the canvas
      ctx.clearRect(0, 0, width, height);

      // Draw static elements
      drawStaticElements();

      // Draw animated balls
      Object.entries(curves).forEach(([label, curve]) => {
        const progress = Math.min(elapsedTime / curve.time, 1);
        const [x, y] = curve.func(progress);
        ctx.beginPath();
        ctx.arc(margin.left + x * graphWidth, margin.top + y * graphHeight, 8, 0, 2 * Math.PI);
        ctx.fillStyle = curve.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Calculate current position and distance to endpoint for each curve
      const progressData: [string, number, number][] = Object.entries(curves).map(([label, curve]) => {
        const progress = Math.min(elapsedTime / curve.time, 1);
        const [x, y] = curve.func(progress);
        const distance = Math.sqrt(Math.pow(1 - x, 2) + Math.pow(1 - y, 2));
        return [label, progress, distance];
      });

      // Sort based on distance to endpoint (lower distance means closer to finishing)
      progressData.sort((a, b) => a[2] - b[2]);

      // Update rankings and distances
      const newRankings = progressData.map(([label]) => label);
      if (JSON.stringify(newRankings) !== JSON.stringify(rankings)) {
        setPrevRankings(rankings);
        setRankings(newRankings);
      }

      setDistanceToEnd(prev => {
        const newDistances = { ...prev };
        progressData.forEach(([label, progress, distance]) => {
          newDistances[label] = distance;
        });
        return newDistances;
      });

      // Update elapsed times only if animation is complete
      if (isAnimationComplete) {
        setElapsedTimes(prev => {
          const newTimes = { ...prev };
          progressData.forEach(([label, progress]) => {
            newTimes[label] = (curves[label] as CurveData).time.toFixed(2) + 's';
          });
          return newTimes;
        });
      }

      if (elapsedTime >= Math.max(...Object.values(curves).map(c => c.time))) {
        setAnimationState('idle');
        setIsAnimationComplete(true);
      } else if (animationState === 'running') {
        setPausedElapsedTime(elapsedTime);
        animationFrameId = requestAnimationFrame(drawFrame);
      }
    };

    if (animationState === 'running') {
      animationFrameId = requestAnimationFrame(drawFrame);
    } else {
      drawFrame(performance.now());
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [animationState, curves, pausedElapsedTime, animationSpeed, cycloidParameter, rankings, isAnimationComplete, setPrevRankings]);

  const handleStartAnimation = useCallback(() => {
    startTimeRef.current = null;
    lastTimestampRef.current = null;
    setPausedElapsedTime(0);
    setAnimationState('running');
    setElapsedTimes({});
    setIsAnimationComplete(false);
  }, [])

  const handlePauseAnimation = useCallback(() => {
    setAnimationState('paused');
  }, [])

  const handleResumeAnimation = useCallback(() => {
    lastTimestampRef.current = null;
    setAnimationState('running');
  }, [])

  const handleResetAnimation = useCallback(() => {
    startTimeRef.current = null;
    lastTimestampRef.current = null;
    setPausedElapsedTime(0);
    setAnimationState('idle');
    setElapsedTimes({});
  }, [])

  const AboutMeModal: React.FC<AboutMeModalProps> = ({ onClose, name, email }) => {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">About Me</h2>
          <p className="mb-2">Name: {name}</p>
          <p className="mb-4">Email: {email}</p>
          <Button onClick={onClose} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
            Close
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className="w-full max-w-5xl mx-auto bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Brachistochrone Demonstration</CardTitle>
          <CardDescription>
            Watch different curves race to the bottom
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          <div className="bg-white">
            <canvas 
              ref={mainCanvasRef} 
              width={900}
              height={500}
              className="border border-gray-300 rounded-lg shadow-lg"
            />
          </div>
          <div className="w-full grid grid-cols-2 gap-6">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Animation Speed</label>
              <div className="flex items-center space-x-2">
                <Slider
                  min={0.1}
                  max={2}
                  step={0.1}
                  value={[animationSpeed]}
                  onValueChange={([value]) => setAnimationSpeed(value)}
                  className="flex-grow"
                />
                <span className="text-sm font-medium w-12 text-right">{animationSpeed.toFixed(1)}x</span>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Cycloid Parameter</label>
              <div className="flex items-center space-x-2">
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={[cycloidParameter]}
                  onValueChange={([value]) => setCycloidParameter(value)}
                  className="flex-grow"
                />
                <span className="text-sm font-medium w-12 text-right">{cycloidParameter.toFixed(1)}</span>
              </div>
            </div>
          </div>
          <div className="w-full flex justify-center space-x-4">
            {animationState === 'idle' && (
              <Button onClick={handleStartAnimation} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
                Start Animation
              </Button>
            )}
            {animationState === 'running' && (
              <Button onClick={handlePauseAnimation} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded">
                Pause Animation
              </Button>
            )}
            {animationState === 'paused' && (
              <Button onClick={handleResumeAnimation} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                Resume Animation
              </Button>
            )}
            {animationState !== 'idle' && (
              <Button onClick={handleResetAnimation} variant="outline" className="border-gray-300 text-gray-700 font-bold py-2 px-4 rounded">
                Reset Animation
              </Button>
            )}
          </div>

          {/* Enhanced rankings display */}
          <div className="w-full bg-blue-50 p-4 rounded-lg mt-6 border border-blue-200 shadow-md">
            <h3 className="text-xl font-bold mb-4 text-center text-blue-800">Live Rankings</h3>
            <div className="space-y-2">
              <AnimatePresence>
                {rankings.map((label, index) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-md shadow-sm overflow-hidden border border-blue-100"
                  >
                    <div className="flex items-center p-2">
                      <div className="flex items-center flex-grow">
                        <div className={`text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-yellow-400 text-white' :
                          index === 1 ? 'bg-gray-300 text-gray-800' :
                          index === 2 ? 'bg-orange-400 text-white' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="ml-2 flex items-center">
                          <span 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: curves[label].color }}
                          ></span>
                          <span className="text-sm font-semibold">{label}</span>
                        </div>
                      </div>
                      <div className="text-sm font-bold mx-2">
                        {isAnimationComplete 
                          ? `${elapsedTimes[label] || '0.00s'}`
                          : `${distanceToEnd[label].toFixed(3)}`
                        }
                      </div>
                      <AnimatePresence mode="wait">
                        {!isAnimationComplete && prevRankings.indexOf(label) !== index && (
                          <motion.div
                            key={`arrow-${label}`}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                            className={`text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full ${
                              prevRankings.indexOf(label) > index 
                                ? 'bg-green-100 text-green-500' 
                                : 'bg-red-100 text-red-500'
                            }`}
                          >
                            {prevRankings.indexOf(label) > index ? '▲' : '▼'}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="w-full flex justify-between">
            <Button
              onClick={() => setShowInstructions(!showInstructions)}
              variant="outline"
              aria-label="Show instructions"
            >
              {showInstructions ? 'Hide' : 'Show'} Instructions
            </Button>
            <Button
              onClick={() => setShowAboutMe(true)}
              variant="outline"
              aria-label="About the creator"
            >
              About Me
            </Button>
          </div>

          {/* About Me section */}
          {showAboutMe && (
            <AboutMeModal
              onClose={() => setShowAboutMe(false)}
              name="Rebin Muhammad"
              email="reben80@gmail.com"
            />
          )}
        </CardContent>
      </Card>

      {showInstructions && <InstructionsPage onClose={() => setShowInstructions(false)} />}
    </>
  )
}

export default BrachistochroneDemo

