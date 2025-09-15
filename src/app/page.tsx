'use client';

import { useState, useEffect } from 'react';
import { DigResult, ApiResponse, MultiSubnetQueryResult, SubnetQueryResult, FailedSubnetQueryResult } from '@/types/dig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [domain, setDomain] = useState('');
  const [recordType, setRecordType] = useState('A');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DigResult | null>(null);
  const [multiResult, setMultiResult] = useState<MultiSubnetQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<{
    digAvailable: boolean;
  } | null>(null);

  const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'PTR', 'SRV'];

  // 聚合解析结果，以IP为key去重
  const aggregateResults = (results: SubnetQueryResult[]) => {
    const ipMap = new Map<string, any>();
    
    results.forEach(({ result, subnetInfo }) => {
      if (result.parsed.answer) {
        result.parsed.answer.forEach((record: any) => {
          if (record.type === 'A' || record.type === 'AAAA') {
            const ip = record.rdata;
            if (!ipMap.has(ip)) {
              ipMap.set(ip, {
                ip,
                type: record.type,
                ttl: record.ttl,
                name: record.name,
                sources: []
              });
            }
            ipMap.get(ip).sources.push({
              country: subnetInfo.country,
              region: subnetInfo.region,
              province: subnetInfo.province,
              isp: subnetInfo.isp,
              subnet: subnetInfo.subnet
            });
          }
        });
      }
    });
    
    return Array.from(ipMap.values());
  };

  // 检查系统状态
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        if (data.success) {
          setSystemStatus({ 
            digAvailable: data.data.digAvailable
          });
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
    setMultiResult(null);

    try {
      const response = await fetch('/api/dig', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: domain.trim(),
          recordType,
        }),
      });

      const data: ApiResponse<DigResult | MultiSubnetQueryResult> = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'DNS查询失败');
      }

      // 判断返回的是单个结果还是多子网结果
      if (data.data && 'successfulResults' in data.data) {
        setMultiResult(data.data as MultiSubnetQueryResult);
      } else {
        setResult(data.data as DigResult);
      }
    } catch (err: any) {
      setError(err.message || 'DNS查询失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">OpenDig</h1>
          <p className="text-muted-foreground">本工具可探测各个地区运营商的 DNS 解析情况</p>
          
          {systemStatus && (
            <div className="mt-4 space-y-2">
              <Badge variant={systemStatus.digAvailable ? "default" : "destructive"} className="inline-flex items-center gap-2">
                {systemStatus.digAvailable ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                {systemStatus.digAvailable ? '已就绪' : 'DIG工具路径设置错误，未找到工具'}
              </Badge>
            </div>
          )}
        </header>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>DNS 查询</CardTitle>
            <CardDescription>输入域名和查询参数来执行 DNS 解析</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="domain" className="text-sm font-medium">
                    域名 *
                  </label>
                  <Input
                    type="text"
                    id="domain"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="例如: example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="recordType" className="text-sm font-medium">
                    记录类型
                  </label>
                  <Select value={recordType} onValueChange={setRecordType}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择记录类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {recordTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !domain.trim()}
                className="w-full"
              >
                {loading ? '查询中...' : '执行DNS查询'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>查询失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>查询结果</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">

                {result.parsed.answer && result.parsed.answer.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">解析结果 ({result.parsed.answer.length} 条记录)</h3>
                    <Card>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          {result.parsed.answer.map((record: any, index: number) => (
                            <div key={index} className="bg-muted rounded p-2 text-sm">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div>
                                  <span className="font-medium">域名:</span>
                                  <div className="text-muted-foreground">{record.name}</div>
                                </div>
                                <div>
                                  <span className="font-medium">类型:</span>
                                  <div className="text-muted-foreground">{record.type}</div>
                                </div>
                                <div>
                                  <span className="font-medium">TTL:</span>
                                  <div className="text-muted-foreground">{record.ttl}</div>
                                </div>
                                <div>
                                  <span className="font-medium">值:</span>
                                  <div className="text-muted-foreground break-all">{record.rdata}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {result.parsed.status && result.parsed.status !== 'SUCCESS' && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">查询状态</h3>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>状态: {result.parsed.status}</AlertTitle>
                    </Alert>
                  </div>
                )}

                {result.parsed.authority && result.parsed.authority.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">权威记录 ({result.parsed.authority.length} 条)</h3>
                    <Card>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          {result.parsed.authority.map((record: any, index: number) => (
                            <div key={index} className="bg-muted rounded p-2 text-sm">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div>
                                  <span className="font-medium">域名:</span>
                                  <div className="text-muted-foreground">{record.name}</div>
                                </div>
                                <div>
                                  <span className="font-medium">类型:</span>
                                  <div className="text-muted-foreground">{record.type}</div>
                                </div>
                                <div>
                                  <span className="font-medium">TTL:</span>
                                  <div className="text-muted-foreground">{record.ttl}</div>
                                </div>
                                <div>
                                  <span className="font-medium">值:</span>
                                  <div className="text-muted-foreground break-all">{record.rdata}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}


                <div>
                  <h3 className="text-sm font-medium mb-2">完整输出</h3>
                  <Card>
                    <CardContent className="p-3">
                      <div className="bg-muted rounded-md p-3 max-h-96 overflow-y-auto">
                        <pre className="text-xs whitespace-pre-wrap">
                          {result.output}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {multiResult && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  多子网查询结果 
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (成功: {multiResult.successCount}/{multiResult.totalQueries})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="results" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="results">
                      聚合解析结果 ({aggregateResults(multiResult.successfulResults).length} 个IP)
                    </TabsTrigger>
                    <TabsTrigger value="status">
                      查询状态详情 ({multiResult.successCount}/{multiResult.totalQueries})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="results" className="space-y-4">
                    {multiResult.successfulResults.length > 0 ? (
                      <Card>
                        <CardContent className="p-3">
                          <div className="space-y-3">
                            {aggregateResults(multiResult.successfulResults).map((ipResult: any, index: number) => (
                              <div key={index} className="bg-muted rounded p-3 text-sm">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                                  <div>
                                    <span className="font-medium">IP地址:</span>
                                    <div className="font-mono text-muted-foreground">{ipResult.ip}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium">类型:</span>
                                    <div className="text-muted-foreground">{ipResult.type}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium">TTL:</span>
                                    <div className="text-muted-foreground">{ipResult.ttl}</div>
                                  </div>
                                </div>
                                <div>
                                  <span className="font-medium">来源地区 ({ipResult.sources.length} 个):</span>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {ipResult.sources.map((source: any, sourceIndex: number) => (
                                      <Badge key={sourceIndex} variant="secondary" className="text-xs">
                                        {source.country} {source.province} {source.isp}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        暂无解析结果
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="status" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>查询状态详情</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>国家</TableHead>
                              <TableHead>大区</TableHead>
                              <TableHead>省份</TableHead>
                              <TableHead>ISP</TableHead>
                              <TableHead>状态</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {multiResult.successfulResults.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.subnetInfo.country}</TableCell>
                                <TableCell>{item.subnetInfo.region}</TableCell>
                                <TableCell>{item.subnetInfo.province}</TableCell>
                                <TableCell>{item.subnetInfo.isp}</TableCell>
                                <TableCell>
                                  <Badge variant="default">成功</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                            {multiResult.failedResults.map((item, index) => (
                              <TableRow key={`failed-${index}`}>
                                <TableCell>{item.subnetInfo.country}</TableCell>
                                <TableCell>{item.subnetInfo.region}</TableCell>
                                <TableCell>{item.subnetInfo.province}</TableCell>
                                <TableCell>{item.subnetInfo.isp}</TableCell>
                                <TableCell>
                                  <Badge variant="destructive">失败</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>完整输出详情</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>国家</TableHead>
                              <TableHead>大区</TableHead>
                              <TableHead>省份</TableHead>
                              <TableHead>ISP</TableHead>
                              <TableHead>完整输出</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {multiResult.successfulResults.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.subnetInfo.country}</TableCell>
                                <TableCell>{item.subnetInfo.region}</TableCell>
                                <TableCell>{item.subnetInfo.province}</TableCell>
                                <TableCell>{item.subnetInfo.isp}</TableCell>
                                <TableCell>
                                  <details className="cursor-pointer">
                                    <summary className="text-primary hover:text-primary/80">查看输出</summary>
                                    <div className="mt-2 bg-muted rounded p-2 max-h-40 overflow-y-auto">
                                      <pre className="text-xs whitespace-pre-wrap">
                                        {item.result.output}
                                      </pre>
                                    </div>
                                  </details>
                                </TableCell>
                              </TableRow>
                            ))}
                            {multiResult.failedResults.map((item, index) => (
                              <TableRow key={`failed-${index}`}>
                                <TableCell>{item.subnetInfo.country}</TableCell>
                                <TableCell>{item.subnetInfo.region}</TableCell>
                                <TableCell>{item.subnetInfo.province}</TableCell>
                                <TableCell>{item.subnetInfo.isp}</TableCell>
                                <TableCell>
                                  <div className="text-destructive text-xs">
                                    错误: {item.error}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}