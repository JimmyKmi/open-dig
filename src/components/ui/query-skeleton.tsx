import { Skeleton } from './skeleton'

export function QueryResultSkeleton() {
  return (
    <div className="space-y-6">
      <div className="border rounded-lg bg-background">
        <div className="p-6">
          <div className="mb-4">
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="space-y-4">
            {/* 解析结果骨架 */}
            <div>
              <Skeleton className="h-5 w-48 mb-2" />
              <div className="border rounded-lg bg-background">
                <div className="p-3">
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-muted rounded p-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div>
                            <Skeleton className="h-4 w-12 mb-1" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                          <div>
                            <Skeleton className="h-4 w-8 mb-1" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                          <div>
                            <Skeleton className="h-4 w-8 mb-1" />
                            <Skeleton className="h-3 w-12" />
                          </div>
                          <div>
                            <Skeleton className="h-4 w-8 mb-1" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 完整输出骨架 */}
            <div>
              <Skeleton className="h-5 w-24 mb-2" />
              <div className="border rounded-lg bg-background">
                <div className="p-3">
                  <div className="bg-muted rounded-md p-3">
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-3 w-full" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MultiQueryResultSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="p-6">
          <div className="mb-4">
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="space-y-4">
            {/* Tabs 骨架 */}
            <div className="space-y-4">
              <div className="grid w-full grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>

              {/* 筛选条件骨架 */}
              <div className="border rounded-lg bg-background p-4">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              </div>

              {/* 结果表格骨架 */}
              <div className="border rounded-lg bg-background">
                <div className="p-6">
                  <div className="space-y-4">
                    {/* 表头 */}
                    <div className="grid grid-cols-6 gap-4 pb-2 border-b">
                      {['国家', '大区', '省份', 'ISP', '代码', ''].map((header, i) => (
                        <Skeleton key={i} className="h-4 w-12" />
                      ))}
                    </div>
                    {/* 表格行 */}
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="grid grid-cols-6 gap-4 py-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
