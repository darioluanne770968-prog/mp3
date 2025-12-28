"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface UserStats {
  dailyUsage: number;
  dailyLimit: number;
  storageUsed: number;
  storageLimit: number;
  tasksCompleted: number;
  tasksPending: number;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  rateLimit: number;
  requests: number;
  enabled: boolean;
  lastUsed: string | null;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      // Fetch API keys
      const keysRes = await fetch("/api/apikey");
      if (keysRes.ok) {
        const keysData = await keysRes.json();
        setApiKeys(keysData.apiKeys || []);
      }

      // For now, use mock stats - in production fetch from API
      setStats({
        dailyUsage: 5,
        dailyLimit: 10,
        storageUsed: 52428800,
        storageLimit: 1073741824,
        tasksCompleted: 15,
        tasksPending: 2,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">控制台</h1>
          <p className="text-gray-400">
            欢迎回来, {session.user.name || session.user.email}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-[#16213e] border-gray-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-gray-400">今日使用量</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats?.dailyUsage} / {stats?.dailyLimit}
              </div>
              <Progress
                value={((stats?.dailyUsage || 0) / (stats?.dailyLimit || 1)) * 100}
                className="mt-2 h-1"
              />
            </CardContent>
          </Card>

          <Card className="bg-[#16213e] border-gray-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-gray-400">存储空间</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatBytes(stats?.storageUsed || 0)}
              </div>
              <Progress
                value={((stats?.storageUsed || 0) / (stats?.storageLimit || 1)) * 100}
                className="mt-2 h-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                共 {formatBytes(stats?.storageLimit || 0)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#16213e] border-gray-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-gray-400">已完成任务</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {stats?.tasksCompleted}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#16213e] border-gray-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-gray-400">进行中</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                {stats?.tasksPending}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-[#16213e] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">🎵 音频工具</CardTitle>
              <CardDescription className="text-gray-400">
                剪辑、合并、转换音频
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/audio">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  开始使用
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-[#16213e] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">🎬 视频工具</CardTitle>
              <CardDescription className="text-gray-400">
                编辑、滤镜、格式转换
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/video">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  开始使用
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-[#16213e] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">📄 PDF工具</CardTitle>
              <CardDescription className="text-gray-400">
                合并、拆分、转换PDF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/pdf">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  开始使用
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* API Keys Section */}
        <Card className="bg-[#16213e] border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">API 密钥</CardTitle>
              <CardDescription className="text-gray-400">
                管理您的 API 访问密钥
              </CardDescription>
            </div>
            <Link href="/dashboard/api-keys">
              <Button variant="outline" className="border-gray-600">
                管理密钥
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {apiKeys.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                暂无 API 密钥，点击"管理密钥"创建
              </p>
            ) : (
              <div className="space-y-2">
                {apiKeys.slice(0, 3).map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-3 bg-[#1a1a2e] rounded"
                  >
                    <div>
                      <p className="text-white font-medium">{key.name}</p>
                      <p className="text-sm text-gray-500 font-mono">{key.key}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">
                        {key.requests} / {key.rateLimit} 请求
                      </p>
                      <p className={`text-xs ${key.enabled ? "text-green-400" : "text-red-400"}`}>
                        {key.enabled ? "启用" : "禁用"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PRO Features */}
        {(session.user as any).role === "FREE" && (
          <Card className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-purple-500 mt-8">
            <CardHeader>
              <CardTitle className="text-white">升级到 PRO</CardTitle>
              <CardDescription className="text-gray-300">
                解锁更多高级功能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-300 mb-4">
                <li>✨ 无限制的每日使用量</li>
                <li>🤖 AI 语音转文字</li>
                <li>🖼️ AI 背景移除</li>
                <li>📊 高级分析功能</li>
                <li>⚡ 优先处理队列</li>
                <li>💾 100GB 存储空间</li>
              </ul>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                升级 PRO
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
