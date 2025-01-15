import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Upload, Volume2, Disc, Coins } from 'lucide-react';

const PayPhone = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedAudio, setProcessedAudio] = useState(null);
  const [error, setError] = useState(null);
  const [coins, setCoins] = useState(0);
  const audioContext = useRef(null);
  
  const initializeAudioContext = () => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('audio/')) {
      setError('Please insert an audio recording');
      return;
    }
    
    setAudioFile(file);
    setError(null);
    setCoins(prev => prev + 25); // Add a quarter when file is uploaded
  };

  const processAudio = async () => {
    if (!audioFile) return;
    if (coins < 50) {
      setError('Please insert more quarters (upload more files)');
      return;
    }
    
    try {
      initializeAudioContext();
      setIsProcessing(true);
      setError(null);
      setCoins(0); // Reset coins after processing

      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);

      // Enhanced audio processing chain
      const source = audioContext.current.createBufferSource();
      source.buffer = audioBuffer;

      const lowShelf = audioContext.current.createBiquadFilter();
      lowShelf.type = 'lowshelf';
      lowShelf.frequency.value = 100;
      lowShelf.gain.value = 3;

      const highShelf = audioContext.current.createBiquadFilter();
      highShelf.type = 'highshelf';
      highShelf.frequency.value = 10000;
      highShelf.gain.value = 2;

      const compressor = audioContext.current.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      source.connect(lowShelf);
      lowShelf.connect(highShelf);
      highShelf.connect(compressor);
      compressor.connect(audioContext.current.destination);

      source.start();
      
      setProcessedAudio(URL.createObjectURL(new Blob([arrayBuffer], { type: audioFile.type })));
      setIsProcessing(false);
    } catch (err) {
      setError('Connection failed: ' + err.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
      <Card className="w-full max-w-2xl mx-auto bg-gray-100 border-4 border-gray-300">
        <CardHeader className="bg-yellow-500 text-gray-900">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="w-8 h-8" />
              <span className="text-2xl font-bold tracking-tight">PAYPHONE</span>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="w-6 h-6" />
              <span className="text-xl">${(coins/100).toFixed(2)}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="text-center text-sm text-gray-600 mb-4">
            Insert 50¢ to enhance your call quality
          </div>

          {/* Retro Display Panel */}
          <div className="bg-gray-900 p-4 rounded-lg text-green-500 font-mono text-sm">
            <div className="mb-2">STATUS: {isProcessing ? 'CONNECTING...' : (audioFile ? 'READY' : 'WAITING')}</div>
            <div>SIGNAL: {audioFile ? '▮▮▮▮▯' : '▯▯▯▯▯'}</div>
          </div>

          {/* File Upload Section */}
          <div className="border-4 border-dashed border-gray-400 rounded-lg p-6 bg-white">
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
              id="audio-upload"
            />
            <label
              htmlFor="audio-upload"
              className="flex flex-col items-center gap-3 cursor-pointer"
            >
              <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center">
                <Disc className="w-8 h-8 text-gray-900" />
              </div>
              <span className="text-sm text-gray-600">
                {audioFile ? audioFile.name : 'Insert Quarter (Upload Audio)'}
              </span>
            </label>
          </div>

          {/* Process Button */}
          <button
            onClick={processAudio}
            disabled={!audioFile || isProcessing || coins < 50}
            className={`w-full py-3 px-4 rounded-md flex items-center justify-center gap-2 
              ${!audioFile || isProcessing || coins < 50
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-yellow-500 hover:bg-yellow-600'} 
              text-gray-900 font-bold transition-colors`}
          >
            <Volume2 className="w-5 h-5" />
            {isProcessing ? 'ENHANCING...' : 'ENHANCE CALL'}
          </button>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="bg-red-100 border-red-400">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {/* Audio Players */}
          <div className="space-y-4 bg-gray-200 p-4 rounded-lg">
            {audioFile && (
              <div>
                <p className="text-sm font-medium mb-2 text-gray-700">Original Recording:</p>
                <audio controls className="w-full">
                  <source src={URL.createObjectURL(audioFile)} type={audioFile.type} />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
            
            {processedAudio && (
              <div>
                <p className="text-sm font-medium mb-2 text-gray-700">Enhanced Recording:</p>
                <audio controls className="w-full">
                  <source src={processedAudio} type={audioFile?.type} />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayPhone;