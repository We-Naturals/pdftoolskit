'use client';

import React from 'react';
import { BatesStampTool } from '@/components/tools/BatesStampTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { Hammer } from 'lucide-react';
import { ToolContent } from '@/components/shared/ToolContent';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { useTranslation } from 'react-i18next';

export default function BatesStampPage() {
    const { t } = useTranslation('common');

    return (
        <div className="container mx-auto px-4 py-12">
            <ToolHeader
                title={t('tools.bates-stamp')}
                description={t('tools.bates-stampDesc')}
                icon={Hammer}
                color="from-slate-700 to-slate-900"
            />

            <div className="max-w-5xl mx-auto space-y-12">
                <BatesStampTool />

                <ToolContent toolName="bates-stamp">
                    <p className="text-slate-600 dark:text-slate-400">
                        Bates numbering (also known as Bates stamping or Bates coding) is a method used in the legal, medical, and business fields to place identifying numbers and/or date/time-marks on images and documents as they are scanned or processed.
                    </p>
                </ToolContent>

                <QuickGuide
                    steps={[
                        { title: t('tools.bates-stamp.step1', 'Upload'), description: t('tools.bates-stamp.step1Desc', 'Upload your PDF document') },
                        { title: t('tools.bates-stamp.step2', 'Configure'), description: t('tools.bates-stamp.step2Desc', 'Configure the prefix and starting number') },
                        { title: t('tools.bates-stamp.step3', 'Position'), description: t('tools.bates-stamp.step3Desc', 'Choose the stamp position on the page') },
                        { title: t('tools.bates-stamp.step4', 'Apply'), description: t('tools.bates-stamp.step4Desc', 'Click \'Apply Bates Stamp\' to process and download') }
                    ]}
                />

                <RelatedTools currentToolId="bates-stamp" />
            </div>
        </div>
    );
}
