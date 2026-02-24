/* eslint-disable */
import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { validatePDFFile } from '@/lib/utils';

export type ToolStatus = 'idle' | 'processing' | 'success' | 'error';

interface UseToolControllerOptions<TInput, TOutput> {
    engine: (input: TInput) => Promise<TOutput>;
    onSuccess?: (result: TOutput) => void;
    onError?: (error: Error) => void;
    statusMessages?: string[];
}

export function useToolController<TInput = File, TOutput = Blob>({
    engine,
    onSuccess,
    onError,
    statusMessages = ['Analyzing document...', 'Processing...', 'Finalizing...'],
}: UseToolControllerOptions<TInput, TOutput>) {
    const [status, setStatus] = useState<ToolStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [result, setResult] = useState<TOutput | null>(null);
    const [file, setFile] = useState<File | null>(null);

    const processingRef = useRef(false);

    const execute = useCallback(async (input: TInput) => {
        if (processingRef.current) return;

        setStatus('processing');
        setProgress(5);
        setStatusMessage(statusMessages[0]);
        processingRef.current = true;

        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                const next = prev + Math.random() * 5;

                // Update status message based on progress
                const messageIndex = Math.min(
                    Math.floor((next / 100) * statusMessages.length),
                    statusMessages.length - 1
                );
                if (statusMessages[messageIndex]) {
                    setStatusMessage(statusMessages[messageIndex]);
                }

                return next > 95 ? 95 : next;
            });
        }, 300);

        try {
            const output = await engine(input);
            clearInterval(progressInterval);
            setProgress(100);
            setStatus('success');
            setResult(output);
            onSuccess?.(output);
            toast.success('Processing complete');
        } catch (error) {
            clearInterval(progressInterval);
            setStatus('error');
            const err = error instanceof Error ? error : new Error('Unknown error');
            onError?.(err);
            toast.error(err.message);
        } finally {
            processingRef.current = false;
        }
    }, [engine, onSuccess, onError, statusMessages]);

    const reset = useCallback(() => {
        setStatus('idle');
        setProgress(0);
        setStatusMessage('');
        setResult(null);
        setFile(null);
        processingRef.current = false;
    }, []);

    const handleFileSelect = useCallback((files: File[]) => {
        const selectedFile = files[0];
        const validation = validatePDFFile(selectedFile);
        if (validation.valid) {
            selectedFile.arrayBuffer().then(buf => {
                (selectedFile as any)._arrayBuffer = buf;
                setFile(selectedFile);
                setResult(null);
            });
            toast.success('Document ready');
        } else {
            toast.error(validation.error || 'Invalid file');
        }
    }, []);

    return {
        status,
        progress,
        statusMessage,
        result,
        file,
        execute,
        reset,
        handleFileSelect,
        setFile,
        setResult,
    };
}
