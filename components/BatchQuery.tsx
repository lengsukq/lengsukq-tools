import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@heroui/input';
import { Button } from '@heroui/button';
import { Checkbox } from '@heroui/checkbox';
import { Select, SelectItem } from '@heroui/select';
import { WhoisResponse } from './domain-checker';
// import { FixedSizeList} from 'react-window';
import { FixedSizeList as _FixedSizeList } from "react-window";

const FixedSizeList = _FixedSizeList as any;
interface PositionConfig {
    type: 'number' | 'letter' | 'input';
    value?: string;
}

interface BatchQueryProps {
    suffix: string;
    onQuery: (domains: string[]) => Promise<WhoisResponse[]>;
}

export function BatchQuery({ suffix, onQuery }: BatchQueryProps) {
    const [batchConfig, setBatchConfig] = useState<{
        positions: PositionConfig[];
        /**
         * 是否使用AABB
         * 是否使用连续数字，只有当所有position都是数字时才生效
         */
        useConsecutive: boolean;
        useAABB: boolean;
        useAABBCC: boolean;
    }>({
        positions: [{ type: 'number' }],
        useConsecutive: false,
        useAABB: false,
        useAABBCC: false,
    });
    const [previewDomains, setPreviewDomains] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [batchResults, setBatchResults] = useState<WhoisResponse[]>([]);

    const rowHeight = 24; // 每行的高度，可以调整
    const maxListHeight = 160; //  定义最大列表高度

    // 检查是否所有位置都是数字
    const isAllNumbers = () => batchConfig.positions.every(pos => pos.type === 'number' || (pos.type === 'input' && /^\d+$/.test(pos.value || '')));

    // 检查是否有任意三个连续的数字
    const hasConsecutiveNumbers = (str: string): boolean => {
        if (str.length < 3) return false;
        for (let i = 0; i <= str.length - 3; i++) {
            const num1 = parseInt(str[i]);
            const num2 = parseInt(str[i + 1]);
            const num3 = parseInt(str[i + 2]);
            if (num2 === (num1 + 1) % 10 && num3 === (num2 + 1) % 10) { // 考虑了9->0的情况
                return true;
            }
        }
        return false;
    };

    const generateAABB = (num: string): string => {
        if (num.length !== 2) return '';
        return num + num;
    }

    const hasAABB = (str: string): boolean => {
        if (str.length < 4) return false;
        for (let i = 0; i <= str.length - 4; i++) {
            const sub = str.substring(i, i + 4);
            if (sub[0] === sub[1] && sub[2] === sub[3]) return true;
        }
        return false;
    }

    const generateAABBCC = (num: string): string => {
        if (num.length !== 6) return '';
        return num;
    }

    const hasAABBCC = (str: string): boolean => {
        if (str.length < 6) return false;
        for (let i = 0; i <= str.length - 6; i++) {
            const sub = str.substring(i, i + 6);
            if (
                sub[0] === sub[1] &&
                sub[2] === sub[3] &&
                sub[4] === sub[5]
            ) return true;
        }
        return false;
    }


    // 生成域名组合
    const generateDomains = useCallback(() => { // 使用 useCallback 优化
        const domains: string[] = [];
        const { positions, useConsecutive } = batchConfig;

        const generateCombinations = (current: string, index: number) => {
            if (index === positions.length) {
                if (isAllNumbers() && useConsecutive ) {
                    // 检查是否有至少3个连续数字
                    if (!hasConsecutiveNumbers(current)) {
                        return;
                    }
                }
                if (isAllNumbers() && batchConfig.useAABB) {
                    if (!hasAABB(current)) {
                        return;
                    }
                }
                if (isAllNumbers() && batchConfig.useAABBCC) {
                    if (!hasAABBCC(current)) {
                        return;
                    }
                }
                domains.push(`${current}.${suffix}`);
                return;
            }

            const pos = positions[index];
            if (pos.type === 'number') {
                for (let i = 0; i <= 9; i++) {
                    generateCombinations(current + i, index + 1);
                }
            } else if (pos.type === 'letter') {
                // 字母生成
                for (let i = 0; i < 26; i++) {
                    const letter = String.fromCharCode(65 + i); // 大写字母
                    generateCombinations(current + letter, index + 1);
                }
            } else if (pos.type === 'input' && pos.value) {
                generateCombinations(current + pos.value, index + 1);
            }
        };

        generateCombinations('', 0);
        return domains;
    }, [batchConfig, suffix]); // 依赖项

    // 更新预览域名列表
    const updatePreviewDomains = useCallback(() => { // 使用 useCallback 优化
        const domains = generateDomains();
        setPreviewDomains(domains);
    }, [generateDomains]); // 依赖项

    // 当配置改变时更新预览
    useEffect(() => {
        updatePreviewDomains();
    }, [updatePreviewDomains]);

    const handleBatchQuery = async () => {
        if (!suffix) {
            alert('请填写域名后缀');
            return;
        }

        setLoading(true);
        setBatchResults([]);
        setProgress(0);
        const domains = previewDomains;

        // 逐个查询域名
        for (let i = 0; i < domains.length; i++) {
            const domain = domains[i];
            try {
                const result = await onQuery([domain]); // 查询单个域名
                // 确保 result 是一个数组，即使 onQuery 只返回一个结果
                const finalResult = Array.isArray(result) ? result : [result];
                setBatchResults(prevResults => [...prevResults, ...finalResult]); // 更新结果
            } catch (error) {
                console.log(`查询 ${domain} 出错`, error);
            }
            setProgress(((i + 1) / domains.length) * 100); // 更新进度
        }
        setLoading(false);
    };

    // 渲染单个域名
    const renderDomainRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
        return (
            <div style={style} className="text-sm text-gray-600 hover:bg-gray-50 p-1 rounded">
                {previewDomains[index]}
            </div>
        );
    }, [previewDomains]);

    // 计算列表高度，确保不超过最大高度
    const listHeight = Math.min(previewDomains.length * rowHeight, maxListHeight);


    // Separate available and registered domains
    const availableDomains = batchResults.filter(result => !result.isRegistered && !result.error);
    const registeredDomains = batchResults.filter(result => result.isRegistered || result.error);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {batchConfig.positions.map((pos, index) => (
                    <div key={index} className="flex gap-2 items-center">
                        <Select
                            selectedKeys={pos.type ? [pos.type] : []} // 将类型转换为字符串数组，以匹配 selectedKeys 的类型
                            onChange={(e) => {
                                const value = e.target.value;
                                const newPositions = [...batchConfig.positions];
                                newPositions[index] = { ...pos, type: value as 'number' | 'letter' | 'input', value: '' };
                                setBatchConfig({ ...batchConfig, positions: newPositions });
                            }}
                            disabled={loading}
                            className="w-24"
                        >
                            <SelectItem key={"number"}>数字</SelectItem>
                            <SelectItem key={"letter"}>字母</SelectItem>
                            <SelectItem key={"input"}>自定义</SelectItem>
                        </Select>
                        {pos.type === 'input' && (
                            <Input
                                value={pos.value || ''}
                                onChange={(e) => {
                                    const newPositions = [...batchConfig.positions];
                                    newPositions[index] = { ...pos, value: e.target.value };
                                    setBatchConfig({ ...batchConfig, positions: newPositions });
                                }}
                                className="w-24"
                                placeholder="输入内容"
                                disabled={loading}
                            />
                        )}
                    </div>
                ))}

                {batchConfig.positions.length < 6 && (
                    <Button
                        onClick={() =>
                            setBatchConfig({
                                ...batchConfig,
                                positions: [...batchConfig.positions, { type: 'number' }],
                            })
                        }
                        disabled={loading}
                        className="px-2 py-1"
                    >
                        +
                    </Button>
                )}

                {batchConfig.positions.length > 1 && (
                    <Button
                        onClick={() =>
                            setBatchConfig({
                                ...batchConfig,
                                positions: batchConfig.positions.slice(0, -1),
                            })
                        }
                        disabled={loading}
                        className="px-2 py-1"
                    >
                        -
                    </Button>
                )}
            </div>

            {isAllNumbers() && ( // 只有当所有位置都是数字或者自定义输入是数字时，才显示顺子号选项
                <div className="flex items-center gap-2">
                    <Checkbox
                        type="checkbox"
                        checked={batchConfig.useConsecutive}
                        onChange={(e) =>
                            setBatchConfig({ ...batchConfig, useConsecutive: e.target.checked })
                        }
                        disabled={loading}
                    />
                    <span className="text-sm text-gray-600">使用顺子号</span>
                </div>
            )}

            {isAllNumbers() && (
                <div className="flex items-center gap-2">
                    <Checkbox
                        checked={batchConfig.useAABB}
                        onChange={(e) =>
                            setBatchConfig({ ...batchConfig, useAABB: e.target.checked })
                        }
                    />
                    <span className="text-sm text-gray-600">使用AABB</span>
                </div>
            )}

            {isAllNumbers() && (
                <div className="flex items-center gap-2">
                    <Checkbox
                        checked={batchConfig.useAABBCC}
                        onChange={(e) =>
                            setBatchConfig({ ...batchConfig, useAABBCC: e.target.checked })
                        }
                    />
                    <span className="text-sm text-gray-600">使用AABBCC</span>
                </div>
            )}

            <Button
                onClick={handleBatchQuery}
                color="primary"
                isLoading={loading}
                disabled={!suffix || loading}
                className="w-full"
            >
                开始批量查询
            </Button>

            {/* 域名预览列表 */}
            {previewDomains.length > 0 && (
                <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg shadow-sm">
                    <div className="font-medium mb-2 text-gray-700">将要查询的域名列表：</div>
                    <div className="bg-gray-800 p-3 rounded">
                        <FixedSizeList
                            height={listHeight} // 使用计算后的高度
                            itemCount={previewDomains.length || 0}
                            itemSize={rowHeight}
                            overscanCount={10}
                            width="100%"
                        >
                            {renderDomainRow}
                        </FixedSizeList>
                    </div>
                </div>
            )}

            {loading && (
                <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                        <div className="text-xs font-semibold text-blue-600">
                            查询进度: {Math.round(progress)}%
                        </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                        <div
                            style={{ width: `${progress}%` }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
                        />
                    </div>
                </div>
            )}

            {/* Display results, available domains first, then registered domains */}
            {(availableDomains.length > 0 || registeredDomains.length > 0) && (
                <div className="space-y-4">
                    {availableDomains.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">可以注册的域名</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">  {/* 1 column on small screens, 2 on medium+ */}
                                {availableDomains.map((result, index) => (
                                    <div key={`available-${index}`} className="p-4 bg-green-800 rounded-lg shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">{result.domain}</span>
                                            <span className="px-2 py-1 text-sm rounded bg-green-200 text-green-800">可以注册</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {registeredDomains.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">已被注册的域名</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">  {/* 1 column on small screens, 2 on medium+ */}
                                {registeredDomains.map((result, index) => (
                                    <div key={`registered-${index}`} className="p-4 bg-red-800 rounded-lg shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">{result.domain}</span>
                                            <span className="px-2 py-1 text-sm rounded text-red-200">
                                                {result.error ? result.error : '已被注册'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
