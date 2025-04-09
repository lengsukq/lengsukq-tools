import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@heroui/input';
import { Button } from '@heroui/button';
import { Select, SelectItem } from '@heroui/select';
import { WhoisResponse } from './domain-checker';
import { FixedSizeList as List } from 'react-window';

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
        useConsecutive: boolean;
    }>({
        positions: [{ type: 'number' }],
        useConsecutive: false,
    });
    const [previewDomains, setPreviewDomains] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [batchResults, setBatchResults] = useState<WhoisResponse[]>([]);

    const rowHeight = 24; // 每行的高度，可以调整
    const maxListHeight = 160; //  定义最大列表高度

    // 检查是否所有位置都是数字
    const isAllNumbers = () => batchConfig.positions.every(pos => pos.type === 'number');

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

    // 生成域名组合
    const generateDomains = useCallback(() => { // 使用 useCallback 优化
        const domains: string[] = [];
        const { positions, useConsecutive } = batchConfig;

        const generateCombinations = (current: string, index: number) => {
            if (index === positions.length) {
                if (isAllNumbers() && useConsecutive) {
                    // 检查是否有至少3个连续数字
                    if (!hasConsecutiveNumbers(current)) {
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

        try {
            const results = await onQuery(domains);
            setBatchResults(results);
            setProgress(100);
        } catch (error) {
            console.error("批量查询出错", error);
            // 处理错误
        } finally {
            setLoading(false);
        }
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


    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {batchConfig.positions.map((pos, index) => (
                    <div key={index} className="flex gap-2 items-center">
                        <Select
                            value={pos.type}
                            onValueChange={(value) => {
                                const newPositions = [...batchConfig.positions];
                                newPositions[index] = { ...pos, type: value as 'number' | 'letter' | 'input', value: '' };
                                setBatchConfig({ ...batchConfig, positions: newPositions });
                            }}
                            disabled={loading}
                            className="w-24"
                        >
                            <SelectItem value="number">数字</SelectItem>
                            <SelectItem value="letter">字母</SelectItem>
                            <SelectItem value="input">自定义</SelectItem>
                        </Select>
                        {pos.type === 'input' && (
                            <Input
                                value={pos.value || ''}
                                onChange={(e) => {
                                    const newPositions = [...batchConfig.positions];
                                    newPositions[index] = { ...pos, value: e.target.value };
                                    setBatchConfig({ ...batchConfig, positions: newPositions });
                                }}
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

            {isAllNumbers() && (
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={batchConfig.useConsecutive}
                        onChange={(e) =>
                            setBatchConfig({ ...batchConfig, useConsecutive: e.target.checked })
                        }
                        disabled={loading}
                        className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-600">使用顺子号</span>
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
                <div className="p-4 bg-gray-100 border border-gray-200 rounded-lg shadow-sm">
                    <div className="font-medium mb-2 text-gray-700">将要查询的域名列表：</div>
                    {/* 移除外层div的 overflow-y-auto,  并且List 组件指定高度 */}
                    <div className="bg-white p-3 rounded">
                        <List
                            height={listHeight} // 使用计算后的高度
                            itemCount={previewDomains.length}
                            itemSize={rowHeight}
                            width="100%"
                        >
                            {renderDomainRow}
                        </List>
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

            {batchResults.length > 0 && (
                <div className="space-y-4">
                    {batchResults.map((result, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="font-medium">{result.domain}</span>
                                <span
                                    className={`px-2 py-1 text-sm rounded ${result.isRegistered ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                                >
                                    {result.isRegistered ? '已被注册' : '可以注册'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
