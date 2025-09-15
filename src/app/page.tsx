'use client';

import { useState, useEffect } from 'react';
import { DigResult, ApiResponse } from '@/types/dig';

export default function Home() {
  const [domain, setDomain] = useState('');
  const [recordType, setRecordType] = useState('A');
  const [dnsServer, setDnsServer] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DigResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<{
    digAvailable: boolean;
  } | null>(null);

  const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'PTR', 'SRV'];

  // 检查系统状态
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        if (data.success) {
          setSystemStatus({ digAvailable: data.data.digAvailable });
        }
      } catch (err) {
        console.error('Failed to check system status:', err);
      }
    };
    checkStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/dig', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: domain.trim(),
          recordType,
          dnsServer: dnsServer.trim() || undefined,
        }),
      });

      const data: ApiResponse<DigResult> = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'DNS查询失败');
      }

      setResult(data.data);
    } catch (err: any) {
      setError(err.message || 'DNS查询失败');
    } finally {
      setLoading(false);
    }
  };

  const formatJsonOutput = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">OpenDig</h1>
          <p className="text-gray-600">基于dig工具的DNS查询Web界面</p>
          
          {systemStatus && (
            <div className="mt-4">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                systemStatus.digAvailable 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  systemStatus.digAvailable ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                {systemStatus.digAvailable ? 'dig工具已就绪' : 'dig工具未找到'}
              </div>
            </div>
          )}
        </header>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
                  域名 *
                </label>
                <input
                  type="text"
                  id="domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="例如: example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="recordType" className="block text-sm font-medium text-gray-700 mb-1">
                  记录类型
                </label>
                <select
                  id="recordType"
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {recordTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="dnsServer" className="block text-sm font-medium text-gray-700 mb-1">
                  DNS服务器（可选）
                </label>
                <input
                  type="text"
                  id="dnsServer"
                  value={dnsServer}
                  onChange={(e) => setDnsServer(e.target.value)}
                  placeholder="例如: 8.8.8.8"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !domain.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '查询中...' : '执行DNS查询'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">查询失败</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">查询结果</h2>
              
              <div className="space-y-4">

                {result.parsed.answer && result.parsed.answer.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">解析结果 ({result.parsed.answer.length} 条记录)</h3>
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <div className="space-y-2">
                        {result.parsed.answer.map((record: any, index: number) => (
                          <div key={index} className="bg-white rounded p-2 text-sm">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div>
                                <span className="font-medium text-green-800">域名:</span>
                                <div className="text-green-700">{record.name}</div>
                              </div>
                              <div>
                                <span className="font-medium text-green-800">类型:</span>
                                <div className="text-green-700">{record.type}</div>
                              </div>
                              <div>
                                <span className="font-medium text-green-800">TTL:</span>
                                <div className="text-green-700">{record.ttl}</div>
                              </div>
                              <div>
                                <span className="font-medium text-green-800">值:</span>
                                <div className="text-green-700 break-all">{record.rdata}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {result.parsed.status && result.parsed.status !== 'SUCCESS' && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">查询状态</h3>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <div className="text-sm text-yellow-800">
                        状态: <span className="font-medium">{result.parsed.status}</span>
                      </div>
                    </div>
                  </div>
                )}

                {result.parsed.authority && result.parsed.authority.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">权威记录 ({result.parsed.authority.length} 条)</h3>
                    <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                      <div className="space-y-2">
                        {result.parsed.authority.map((record: any, index: number) => (
                          <div key={index} className="bg-white rounded p-2 text-sm">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div>
                                <span className="font-medium text-purple-800">域名:</span>
                                <div className="text-purple-700">{record.name}</div>
                              </div>
                              <div>
                                <span className="font-medium text-purple-800">类型:</span>
                                <div className="text-purple-700">{record.type}</div>
                              </div>
                              <div>
                                <span className="font-medium text-purple-800">TTL:</span>
                                <div className="text-purple-700">{record.ttl}</div>
                              </div>
                              <div>
                                <span className="font-medium text-purple-800">值:</span>
                                <div className="text-purple-700 break-all">{record.rdata}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {result.parsed.statistics && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">查询统计</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-blue-800">查询时间:</span>
                          <div className="text-blue-700">{result.parsed.statistics.queryTime}</div>
                        </div>
                        <div>
                          <span className="font-medium text-blue-800">服务器:</span>
                          <div className="text-blue-700">{result.parsed.statistics.server}</div>
                        </div>
                        <div>
                          <span className="font-medium text-blue-800">查询时间:</span>
                          <div className="text-blue-700">{result.parsed.statistics.when}</div>
                        </div>
                        <div>
                          <span className="font-medium text-blue-800">消息大小:</span>
                          <div className="text-blue-700">{result.parsed.statistics.msgSize}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">完整输出</h3>
                  <div className="bg-gray-100 rounded-md p-3 max-h-96 overflow-y-auto">
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                      {result.output}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}