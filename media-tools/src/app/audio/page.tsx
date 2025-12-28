import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Scissors,
  Merge,
  Volume2,
  Gauge,
  Music2,
  Sliders,
  RotateCcw,
  Mic,
  VolumeX,
  Bell,
  Music,
} from "lucide-react";

const audioTools = [
  { name: "Trim Audio", description: "Cut and trim audio files to the perfect length", icon: Scissors, href: "/audio/trim" },
  { name: "Merge Audio", description: "Combine multiple audio files into one", icon: Merge, href: "/audio/merge" },
  { name: "Change Volume", description: "Make your audio louder or quieter", icon: Volume2, href: "/audio/volume" },
  { name: "Change Speed", description: "Speed up or slow down audio playback", icon: Gauge, href: "/audio/speed" },
  { name: "Change Pitch", description: "Shift the pitch up or down", icon: Music2, href: "/audio/pitch" },
  { name: "Equalizer", description: "Adjust bass, mid, and treble frequencies", icon: Sliders, href: "/audio/equalizer" },
  { name: "Reverse Audio", description: "Play your audio backwards", icon: RotateCcw, href: "/audio/reverse" },
  { name: "Voice Recorder", description: "Record audio from your microphone", icon: Mic, href: "/audio/recorder" },
  { name: "Remove Vocals", description: "Extract instrumental from songs", icon: VolumeX, href: "/audio/vocal-remove" },
  { name: "Ringtone Maker", description: "Create custom phone ringtones", icon: Bell, href: "/audio/ringtone" },
];

export default function AudioToolsPage() {
  return (
    <div className="container py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-purple-600 flex items-center justify-center">
            <Music className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Audio Tools</h1>
            <p className="text-muted-foreground">Edit and transform your audio files</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {audioTools.map((tool) => (
            <Link key={tool.href} href={tool.href}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <tool.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{tool.name}</h3>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
