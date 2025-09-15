'use client';

import {useState, useEffect, useMemo} from 'react';
import {DigResult, ApiResponse, MultiSubnetQueryResult, SubnetQueryResult, FailedSubnetQueryResult} from '@/types/dig';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Combobox, ComboboxOption} from '@/components/ui/combobox';
import {Badge} from '@/components/ui/badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {AlertCircle, CheckCircle2, Search, X} from 'lucide-react';
import {MultiQueryResultSkeleton} from '@/components/ui/query-skeleton';
import {Footer} from '@/components/ui/footer';
import {validateDomain} from '@/lib/utils';

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

  // 域名验证状态
  const [domainValidation, setDomainValidation] = useState<{
    isValid: boolean;
    error?: string;
  }>({isValid: false});

  // 筛选状态
  const [filters, setFilters] = useState({
    country: '',
    region: '',
    province: '',
    isp: '',
    code: '',
    ipSearch: ''
  });


  const recordTypes: ComboboxOption[] = [
    {value: 'A', label: 'A'},
    {value: 'AAAA', label: 'AAAA'},
    {value: 'CNAME', label: 'CNAME'},
    {value: 'MX', label: 'MX'},
    {value: 'NS', label: 'NS'},
    {value: 'TXT', label: 'TXT'},
    {value: 'SOA', label: 'SOA'},
    {value: 'PTR', label: 'PTR'},
    {value: 'SRV', label: 'SRV'}
  ];

  // 聚合解析结果，以IP为key去重
  const aggregateResults = (results: SubnetQueryResult[]) => {
    const ipMap = new Map<string, { ip: string; type: string; ttl: number; name: string; sources: Array<{ country: string; region: string; province: string; isp: string; subnet: string }> }>();

    results.forEach(({result, subnetInfo}) => {
      if (result.parsed.answer) {
        result.parsed.answer.forEach((record: { type: string; rdata: string; ttl: number; name: string }) => {
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

  // 生成所有IP的逗号分隔文本
  const generateIpListText = (results: SubnetQueryResult[]) => {
    const ipSet = new Set<string>();
    results.forEach(({result}) => {
      if (result.parsed.answer) {
        result.parsed.answer.forEach((record: { type: string; rdata: string }) => {
          if (record.type === 'A' || record.type === 'AAAA') {
            ipSet.add(record.rdata);
          }
        });
      }
    });
    return Array.from(ipSet).join(',');
  };

  // 获取唯一值列表用于筛选选项
  const getUniqueValues = (multiResult: MultiSubnetQueryResult) => {
    const allResults = [...multiResult.successfulResults, ...multiResult.failedResults];

    // 处理空白值，将空字符串或null/undefined显示为"<为空>"
    const processValues = (values: string[]) => {
      const processed = values.map(value => value || '<为空>');
      return [...new Set(processed)].sort();
    };

    const countries = processValues(allResults.map(item => item.subnetInfo.country));
    const regions = processValues(allResults.map(item => item.subnetInfo.region));
    const provinces = processValues(allResults.map(item => item.subnetInfo.province));
    const isps = processValues(allResults.map(item => item.subnetInfo.isp));
    const codes = processValues(multiResult.successfulResults.map(item => item.result.parsed.status));

    return {countries, regions, provinces, isps, codes};
  };

  // 创建带全选选项的Combobox选项
  const createComboboxOptions = (values: string[]) => {
    const options = [
      {value: '', label: '<全选>'}
    ];
    values.forEach(value => {
      options.push({value, label: value});
    });
    return options;
  };

  // 筛选结果
  const filteredResults = useMemo(() => {
    if (!multiResult) return {successfulResults: [], failedResults: []};

    const filterItem = (item: SubnetQueryResult | FailedSubnetQueryResult) => {
      const {country, region, province, isp, code, ipSearch} = filters;

      // 基本字段筛选
      if (country) {
        const itemCountry = item.subnetInfo.country || '';
        const filterCountry = country === '<为空>' ? '' : country;
        if (itemCountry !== filterCountry) return false;
      }
      if (region) {
        const itemRegion = item.subnetInfo.region || '';
        const filterRegion = region === '<为空>' ? '' : region;
        if (itemRegion !== filterRegion) return false;
      }
      if (province) {
        const itemProvince = item.subnetInfo.province || '';
        const filterProvince = province === '<为空>' ? '' : province;
        if (itemProvince !== filterProvince) return false;
      }
      if (isp) {
        const itemIsp = item.subnetInfo.isp || '';
        const filterIsp = isp === '<为空>' ? '' : isp;
        if (itemIsp !== filterIsp) return false;
      }

      // 代码筛选（只对成功结果有效）
      if (code && 'result' in item) {
        const itemCode = item.result.parsed.status || '';
        const filterCode = code === '<为空>' ? '' : code;
        if (itemCode !== filterCode) return false;
      } else if (code && !('result' in item)) {
        return false; // 失败结果没有代码
      }

      // IP搜索（在成功结果中搜索解析出的IP）
      if (ipSearch && 'result' in item) {
        const hasMatchingIP = item.result.parsed.answer?.some((record: { rdata: string }) =>
          record.rdata.toLowerCase().includes(ipSearch.toLowerCase())
        );
        if (!hasMatchingIP) return false;
      } else if (ipSearch && !('result' in item)) {
        return false; // 失败结果没有IP
      }

      return true;
    };

    return {
      successfulResults: multiResult.successfulResults.filter(filterItem),
      failedResults: multiResult.failedResults.filter(filterItem),
      totalQueries: multiResult.totalQueries,
      successCount: multiResult.successfulResults.filter(filterItem).length,
      failureCount: multiResult.failedResults.filter(filterItem).length
    };
  }, [multiResult, filters]);

  // 重置筛选
  const resetFilters = () => {
    setFilters({
      country: '',
      region: '',
      province: '',
      isp: '',
      code: '',
      ipSearch: ''
    });
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

  // 域名输入变化时的实时验证
  useEffect(() => {
    if (domain.trim()) {
      const validation = validateDomain(domain);
      setDomainValidation(validation);
    } else {
      setDomainValidation({isValid: false});
    }
  }, [domain]);

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
        // 处理验证错误
        if (data.code === 'InvalidParameters' && data.errors) {
          throw new Error(`参数验证失败: ${data.errors.join(', ')}`);
        }
        throw new Error(data.message || 'DNS查询失败');
      }

      // 判断返回的是单个结果还是多子网结果
      if (data.data && 'successfulResults' in data.data) {
        setMultiResult(data.data as MultiSubnetQueryResult);
      } else {
        setResult(data.data as DigResult);
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'DNS查询失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-7xl mx-auto px-4">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">OpenDig</h1>
          <p className="text-muted-foreground">本工具可探测各个地区运营商的 DNS 解析情况</p>

          {systemStatus?.digAvailable === false && (
            <div className="mt-4 space-y-2">
              <Badge variant={systemStatus.digAvailable ? "default" : "destructive"}
                     className="inline-flex items-center gap-2">
                {systemStatus.digAvailable ? (
                  <CheckCircle2 className="h-3 w-3"/>
                ) : (
                  <AlertCircle className="h-3 w-3"/>
                )}
                &apos;DIG工具路径设置错误，未找到工具&apos;
              </Badge>
            </div>
          )}
        </header>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_200px] gap-4">
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type="text"
                    id="domain"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="example.com"
                    required
                    className={`pr-10 ${
                      domain.trim() && !domainValidation.isValid
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : domain.trim() && domainValidation.isValid
                          ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                          : ''
                    }`}
                  />
                  {domain.trim() && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {domainValidation.isValid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500"/>
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500"/>
                      )}
                    </div>
                  )}
                </div>
                {domain.trim() && !domainValidation.isValid && domainValidation.error && (
                  <p className="text-sm text-red-500">{domainValidation.error}</p>
                )}
              </div>

              <div className="space-y-2">
                <Combobox
                  options={recordTypes}
                  value={recordType}
                  onValueChange={setRecordType}
                  placeholder="选择记录类型"
                  searchPlaceholder="搜索记录类型..."
                  emptyText="未找到记录类型"
                  className="w-full"
                  popoverClassName="w-[200px]"
                />
              </div>
              <div className="space-y-2">
                <Button
                  type="submit"
                  disabled={loading || !domain.trim() || !domainValidation.isValid}
                  className="w-full"
                >
                  {loading ? '查询中...' : 'DIG'}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {error && (
          <div className="p-6">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4"/>
              <AlertTitle>查询失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {loading && (
          <MultiQueryResultSkeleton/>
        )}

        {!loading && result && (
          <div className="space-y-6">
            <div className="border rounded-lg bg-background">
              <div className="p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">查询结果</h2>
                </div>
                <div className="space-y-4">

                  {result.parsed.answer && result.parsed.answer.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">解析结果 ({result.parsed.answer.length} 条记录)</h3>
                      <div className="border rounded-lg bg-background">
                        <div className="p-3">
                          <div className="space-y-2">
                            {result.parsed.answer.map((record: { name: string; type: string; ttl: number; rdata: string }, index: number) => (
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
                                  {/* <div>
                                    <span className="font-medium">TTL:</span>
                                    <div className="text-muted-foreground">{record.ttl}</div>
                                  </div> */}
                                  <div>
                                    <span className="font-medium">值:</span>
                                    <div className="text-muted-foreground break-all">{record.rdata}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {result.parsed.status && result.parsed.status !== 'SUCCESS' && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">查询状态</h3>
                      <Alert>
                        <AlertCircle className="h-4 w-4"/>
                        <AlertTitle>状态: {result.parsed.status}</AlertTitle>
                      </Alert>
                    </div>
                  )}

                  {result.parsed.authority && result.parsed.authority.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">权威记录 ({result.parsed.authority.length} 条)</h3>
                      <div className="border rounded-lg bg-background">
                        <div className="p-3">
                          <div className="space-y-2">
                            {result.parsed.authority.map((record: { name: string; type: string; ttl: number; rdata: string }, index: number) => (
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
                        </div>
                      </div>
                    </div>
                  )}


                  <div>
                    <h3 className="text-sm font-medium mb-2">完整输出</h3>
                    <div className="border rounded-lg bg-background">
                      <div className="p-3">
                        <div className="bg-muted rounded-md p-3 max-h-96 overflow-y-auto">
                          <pre className="text-xs whitespace-pre-wrap">
                            {result.output}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && multiResult && (
          <div className="space-y-6">
            <div>
              <div className="p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">
                    多子网查询结果
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      (成功: {filteredResults.successCount}/{filteredResults.totalQueries})
                    </span>
                  </h2>
                </div>
                <Tabs defaultValue="results" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="results">
                      聚合解析结果 ({aggregateResults(filteredResults.successfulResults).length} 个IP)
                    </TabsTrigger>
                    <TabsTrigger value="status">
                      查询状态详情 ({filteredResults.successCount}/{filteredResults.totalQueries})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="results" className="space-y-4">
                    {/* IP列表输入框 */}
                    {filteredResults.successfulResults.length > 0 && (
                      <div className="border rounded-lg bg-background">
                        <div className="p-4">
                          <div className="mb-2">
                            <h3 className="text-sm font-medium">所有IP列表 (逗号分隔)</h3>
                          </div>
                          <textarea
                            value={generateIpListText(filteredResults.successfulResults)}
                            readOnly
                            className="w-full font-mono text-xs border border-input bg-background px-3 py-2 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            style={{
                              height: 'auto',
                              minHeight: '200px',
                              maxHeight: '70vh'
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {filteredResults.successfulResults.length > 0 ? (
                      <div className="border rounded-lg bg-background">
                        <div className="p-3 bg-zinc-500/10">
                          <div className="space-y-3">
                            {aggregateResults(filteredResults.successfulResults).map((ipResult: { ip: string; type: string; ttl: number; sources: Array<{ country: string; province: string; isp: string }> }, index: number) => (
                              <div key={index} className="bg-white dark:bg-black rounded py-1 px-3 text-sm">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-2">
                                  <div className="max-w-[200px] flex flex-col gap-1">
                                    <div>
                                      <span className="font-medium">IP:</span> <a
                                      className="font-mono text-muted-foreground">{ipResult.ip}</a>
                                    </div>
                                    <div>
                                      <span className="font-medium">TYPE:</span> <a
                                      className="font-mono text-muted-foreground">{ipResult.type}</a>
                                    </div>
                                    <div>
                                      <span className="font-medium">TTL:</span> <a
                                      className="font-mono text-muted-foreground">{ipResult.ttl}</a>
                                    </div>
                                  </div>
                                  <div className="col-span-3 flex flex-col">
                                    <span className="font-medium">{ipResult.sources.length} 个来源:</span>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {ipResult.sources.map((source: { country: string; province: string; isp: string }, sourceIndex: number) => (
                                        <Badge key={sourceIndex} variant="secondary" className="text-xs">
                                          {source.country} {source.province} {source.isp}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        暂无解析结果
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="status" className="space-y-4">
                    {/* 筛选UI */}
                    <div className="border rounded-lg bg-background p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium">筛选条件</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetFilters}
                          className="h-8 px-2"
                        >
                          <X className="h-3 w-3 mr-1"/>
                          重置
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">国家</label>
                          <Combobox
                            options={createComboboxOptions(getUniqueValues(multiResult).countries)}
                            value={filters.country}
                            onValueChange={(value) => setFilters(prev => ({...prev, country: value}))}
                            placeholder="选择国家"
                            searchPlaceholder="搜索国家..."
                            emptyText="未找到国家"
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">大区</label>
                          <Combobox
                            options={createComboboxOptions(getUniqueValues(multiResult).regions)}
                            value={filters.region}
                            onValueChange={(value) => setFilters(prev => ({...prev, region: value}))}
                            placeholder="选择大区"
                            searchPlaceholder="搜索大区..."
                            emptyText="未找到大区"
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">省份</label>
                          <Combobox
                            options={createComboboxOptions(getUniqueValues(multiResult).provinces)}
                            value={filters.province}
                            onValueChange={(value) => setFilters(prev => ({...prev, province: value}))}
                            placeholder="选择省份"
                            searchPlaceholder="搜索省份..."
                            emptyText="未找到省份"
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">ISP</label>
                          <Combobox
                            options={createComboboxOptions(getUniqueValues(multiResult).isps)}
                            value={filters.isp}
                            onValueChange={(value) => setFilters(prev => ({...prev, isp: value}))}
                            placeholder="选择ISP"
                            searchPlaceholder="搜索ISP..."
                            emptyText="未找到ISP"
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">代码</label>
                          <Combobox
                            options={createComboboxOptions(getUniqueValues(multiResult).codes)}
                            value={filters.code}
                            onValueChange={(value) => setFilters(prev => ({...prev, code: value}))}
                            placeholder="选择代码"
                            searchPlaceholder="搜索代码..."
                            emptyText="未找到代码"
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">IP搜索</label>
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
                            <Input
                              placeholder="搜索IP地址..."
                              value={filters.ipSearch}
                              onChange={(e) => setFilters(prev => ({...prev, ipSearch: e.target.value}))}
                              className="pl-8"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg bg-background">
                      <div className="p-6">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>国家</TableHead>
                              <TableHead>大区</TableHead>
                              <TableHead>省份</TableHead>
                              <TableHead>ISP</TableHead>
                              <TableHead>代码</TableHead>
                              <TableHead>最后一跳CNAME</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredResults.successfulResults.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="max-w-[30px]">{item.subnetInfo.country}</TableCell>
                                <TableCell className="max-w-[30px]">{item.subnetInfo.region}</TableCell>
                                <TableCell className="max-w-[30px]">{item.subnetInfo.province}</TableCell>
                                <TableCell className="max-w-[30px]">{item.subnetInfo.isp}</TableCell>
                                <TableCell className="max-w-[30px]">
                                  <Badge variant={item.result.parsed.status === 'NOERROR' ? "default" : "secondary"}>
                                    {item.result.parsed.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-[100px]">
                                  <div className="text-xs font-mono break-all">
                                    {item.result.parsed.lastCname || '-'}
                                  </div>
                                </TableCell>
                                <TableCell className="max-w-60">
                                  <div className="bg-muted rounded p-2 max-h-40 overflow-x-auto overflow-y-auto">
                                    <pre className="text-xs">
                                      {item.result.output}
                                    </pre>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            {filteredResults.failedResults.map((item, index) => (
                              <TableRow key={`failed-${index}`}>
                                <TableCell>{item.subnetInfo.country}</TableCell>
                                <TableCell>{item.subnetInfo.region}</TableCell>
                                <TableCell>{item.subnetInfo.province}</TableCell>
                                <TableCell>{item.subnetInfo.isp}</TableCell>
                                <TableCell>
                                  <Badge variant="destructive">ERROR</Badge>
                                </TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>
                                  <div className="text-destructive text-xs">
                                    ERROR: {item.error}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {filteredResults.successfulResults.length === 0 && filteredResults.failedResults.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            没有符合筛选条件的结果
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}