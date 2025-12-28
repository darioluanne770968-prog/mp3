import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Video,
  MonitorPlay,
  Crop,
  RotateCw,
  Volume1,
  Music,
  Repeat,
  Type,
  FileText,
  FileSpreadsheet,
  Image,
  FilePlus,
  Split,
  Minimize2,
  Lock,
  Unlock,
  FileAudio,
  FileVideo,
  ImageIcon,
  File,
  Package,
} from "lucide-react";

const audioTools = [
  { name: "Trim Audio", description: "Cut and trim audio files", icon: Scissors, href: "/audio/trim" },
  { name: "Merge Audio", description: "Combine multiple audio files", icon: Merge, href: "/audio/merge" },
  { name: "Change Volume", description: "Adjust audio volume", icon: Volume2, href: "/audio/volume" },
  { name: "Change Speed", description: "Speed up or slow down", icon: Gauge, href: "/audio/speed" },
  { name: "Change Pitch", description: "Shift audio pitch", icon: Music2, href: "/audio/pitch" },
  { name: "Equalizer", description: "Adjust bass, mid, treble", icon: Sliders, href: "/audio/equalizer" },
  { name: "Reverse Audio", description: "Play audio backwards", icon: RotateCcw, href: "/audio/reverse" },
  { name: "Voice Recorder", description: "Record from microphone", icon: Mic, href: "/audio/recorder" },
  { name: "Remove Vocals", description: "Extract instrumental", icon: VolumeX, href: "/audio/vocal-remove" },
  { name: "Ringtone Maker", description: "Create phone ringtones", icon: Bell, href: "/audio/ringtone" },
];

const videoTools = [
  { name: "Video Editor", description: "Full-featured editor", icon: Video, href: "/video/editor" },
  { name: "Screen Recorder", description: "Record your screen", icon: MonitorPlay, href: "/video/screen-recorder" },
  { name: "Trim Video", description: "Cut video clips", icon: Scissors, href: "/video/trim" },
  { name: "Crop Video", description: "Crop video frame", icon: Crop, href: "/video/crop" },
  { name: "Rotate Video", description: "Rotate or flip video", icon: RotateCw, href: "/video/rotate" },
  { name: "Change Speed", description: "Speed up or slow down", icon: Gauge, href: "/video/speed" },
  { name: "Adjust Volume", description: "Change video volume", icon: Volume1, href: "/video/volume" },
  { name: "Mute Video", description: "Remove audio track", icon: VolumeX, href: "/video/mute" },
  { name: "Add Music", description: "Add background music", icon: Music, href: "/video/add-music" },
  { name: "Loop Video", description: "Repeat video", icon: Repeat, href: "/video/loop" },
  { name: "Reverse Video", description: "Play video backwards", icon: RotateCcw, href: "/video/reverse" },
  { name: "Add Text", description: "Add text to video", icon: Type, href: "/video/add-text" },
];

const pdfTools = [
  { name: "PDF to Word", description: "Convert PDF to DOCX", icon: FileText, href: "/pdf/to-word" },
  { name: "PDF to Excel", description: "Convert PDF to XLSX", icon: FileSpreadsheet, href: "/pdf/to-excel" },
  { name: "PDF to JPG", description: "Convert PDF to images", icon: Image, href: "/pdf/to-jpg" },
  { name: "Word to PDF", description: "Convert DOCX to PDF", icon: FileText, href: "/pdf/from-word" },
  { name: "Merge PDF", description: "Combine PDF files", icon: FilePlus, href: "/pdf/merge" },
  { name: "Split PDF", description: "Split PDF into parts", icon: Split, href: "/pdf/split" },
  { name: "Compress PDF", description: "Reduce PDF size", icon: Minimize2, href: "/pdf/compress" },
  { name: "Protect PDF", description: "Add password", icon: Lock, href: "/pdf/protect" },
  { name: "Unlock PDF", description: "Remove password", icon: Unlock, href: "/pdf/unlock" },
  { name: "Rotate PDF", description: "Rotate PDF pages", icon: RotateCw, href: "/pdf/rotate" },
];

const converters = [
  { name: "Audio Converter", description: "MP3, WAV, M4A, OGG...", icon: FileAudio, href: "/convert/audio" },
  { name: "Video Converter", description: "MP4, WebM, AVI, MOV...", icon: FileVideo, href: "/convert/video" },
  { name: "Image Converter", description: "PNG, JPG, WebP, GIF...", icon: ImageIcon, href: "/convert/image" },
  { name: "Document Converter", description: "PDF, DOCX, TXT...", icon: File, href: "/convert/document" },
  { name: "Font Converter", description: "TTF, OTF, WOFF...", icon: Type, href: "/convert/font" },
  { name: "Archive Tools", description: "ZIP, RAR, 7Z...", icon: Package, href: "/convert/archive" },
];

function ToolSection({
  title,
  description,
  tools,
  color,
}: {
  title: string;
  description: string;
  tools: { name: string; description: string; icon: React.ElementType; href: string }[];
  color: string;
}) {
  return (
    <section className="py-12">
      <div className="container">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center mb-3 ${color} group-hover:scale-110 transition-transform`}>
                    <tool.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-medium mb-1">{tool.name}</h3>
                  <p className="text-xs text-muted-foreground">{tool.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div>
      <section className="py-20 bg-gradient-to-b from-primary/10 to-background">
        <div className="container text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Free Online Media Tools
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Edit audio, video, and PDF files directly in your browser. No software installation required.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/audio/trim">
              <Button size="lg" className="gap-2">
                <Scissors className="h-5 w-5" />
                Trim Audio
              </Button>
            </Link>
            <Link href="/video/trim">
              <Button size="lg" variant="outline" className="gap-2">
                <Video className="h-5 w-5" />
                Edit Video
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <ToolSection
        title="Audio Tools"
        description="Edit and transform your audio files"
        tools={audioTools}
        color="bg-purple-600"
      />

      <div className="border-t" />

      <ToolSection
        title="Video Tools"
        description="Edit and enhance your video content"
        tools={videoTools}
        color="bg-blue-600"
      />

      <div className="border-t" />

      <ToolSection
        title="PDF Tools"
        description="Convert, merge, split, and edit PDF files"
        tools={pdfTools}
        color="bg-red-600"
      />

      <div className="border-t" />

      <ToolSection
        title="Format Converters"
        description="Convert files between different formats"
        tools={converters}
        color="bg-green-600"
      />

      <section className="py-20 bg-card border-t">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Media Tools?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>100% Free</CardTitle>
                <CardDescription>
                  All tools are completely free to use with no hidden costs or watermarks.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Secure & Private</CardTitle>
                <CardDescription>
                  Files are automatically deleted after 24 hours. Your data stays private.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>No Installation</CardTitle>
                <CardDescription>
                  Works directly in your browser. No software download required.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
