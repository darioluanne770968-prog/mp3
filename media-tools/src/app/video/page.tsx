import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Video,
  MonitorPlay,
  Scissors,
  Crop,
  RotateCw,
  Gauge,
  Volume1,
  VolumeX,
  Music,
  Repeat,
  RotateCcw,
  Type,
} from "lucide-react";

const videoTools = [
  { name: "Video Editor", description: "Full-featured video editing suite", icon: Video, href: "/video/editor" },
  { name: "Screen Recorder", description: "Record your screen directly in browser", icon: MonitorPlay, href: "/video/screen-recorder" },
  { name: "Trim Video", description: "Cut and trim video clips", icon: Scissors, href: "/video/trim" },
  { name: "Crop Video", description: "Change frame size and aspect ratio", icon: Crop, href: "/video/crop" },
  { name: "Rotate Video", description: "Rotate or flip your video", icon: RotateCw, href: "/video/rotate" },
  { name: "Change Speed", description: "Speed up or slow down video", icon: Gauge, href: "/video/speed" },
  { name: "Adjust Volume", description: "Change the audio volume", icon: Volume1, href: "/video/volume" },
  { name: "Mute Video", description: "Remove audio track", icon: VolumeX, href: "/video/mute" },
  { name: "Add Music", description: "Add background music", icon: Music, href: "/video/add-music" },
  { name: "Loop Video", description: "Repeat video multiple times", icon: Repeat, href: "/video/loop" },
  { name: "Reverse Video", description: "Play video backwards", icon: RotateCcw, href: "/video/reverse" },
  { name: "Add Text", description: "Add captions and titles", icon: Type, href: "/video/add-text" },
];

export default function VideoToolsPage() {
  return (
    <div className="container py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center">
            <Video className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Video Tools</h1>
            <p className="text-muted-foreground">Edit and enhance your video content</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videoTools.map((tool) => (
            <Link key={tool.href} href={tool.href}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
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
