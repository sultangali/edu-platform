import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import LoadingScreen from '../../components/common/LoadingScreen';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const CertificateView = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const certificateRef = useRef(null);

  useEffect(() => {
    fetchCertificate();
    // eslint-disable-next-line
  }, [id]);

  const fetchCertificate = async () => {
    try {
      const response = await api.get(`/certificates/${id}`);
      // console.log('Certificate response:', response.data); // Debug log
      if (response.data.success && response.data.data) {
        setCertificate(response.data.data);
      } else {
        setCertificate(null);
      }
    } catch (error) {
      console.error('Error fetching certificate:', error);
      setCertificate(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadAsPNG = async () => {
    if (!certificateRef.current || !certificate) return;

    setExporting(true);
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: false,
      });

      const link = document.createElement('a');
      link.download = `certificate-${certificate.certificateId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting PNG:', error);
      alert(t('certView.errors.exportPng'));
    } finally {
      setExporting(false);
    }
  };

  const downloadAsPDF = async () => {
    if (!certificateRef.current || !certificate) return;

    setExporting(true);
    try {
      // Render certificate to canvas
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: false,
      });

      // Get image data
      const imgData = canvas.toDataURL('image/png', 1.0);

      // A4 landscape dimensions in mm
      const pdfWidth = 297;
      const pdfHeight = 210;

      // Calculate aspect ratios
      const imgAspectRatio = canvas.width / canvas.height;
      const pdfAspectRatio = pdfWidth / pdfHeight;

      // Calculate dimensions to fit A4 landscape while maintaining aspect ratio
      let imgWidth, imgHeight, xOffset, yOffset;

      if (imgAspectRatio > pdfAspectRatio) {
        imgWidth = pdfWidth;
        imgHeight = pdfWidth / imgAspectRatio;
        xOffset = 0;
        yOffset = (pdfHeight - imgHeight) / 2;
      } else {
        imgHeight = pdfHeight;
        imgWidth = pdfHeight * imgAspectRatio;
        xOffset = (pdfWidth - imgWidth) / 2;
        yOffset = 0;
      }

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Add image to PDF
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);

      // Save PDF
      pdf.save(`certificate-${certificate.certificateId}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert(t('certView.errors.exportPdf'));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('certView.notFound')}
          </h2>
          <Link
            to="/certificates"
            className="text-french-blue-600 dark:text-french-blue-400 hover:underline"
          >
            {t('certView.backToList')}
          </Link>
        </div>
      </div>
    );
  }

  const issueDate = new Date(certificate.issuedAt);
  const formattedDate = issueDate.toLocaleDateString(t('certView.dateLocale'), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Action Buttons */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/certificates"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('certView.backBtn')}
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={downloadAsPNG}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {exporting ? t('certView.exporting') : t('certView.downloadPng')}
            </button>
            <button
              onClick={downloadAsPDF}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-french-blue-600 hover:bg-french-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {exporting ? t('certView.exporting') : t('certView.downloadPdf')}
            </button>
          </div>
        </div>

        {/* Certificate */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 overflow-hidden">
          <div
            ref={certificateRef}
            data-certificate="true"
            className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-16"
            style={{
              aspectRatio: '1.414',
              backgroundImage: `
                linear-gradient(to right, rgba(59, 130, 246, 0.05) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(59, 130, 246, 0.05) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              minWidth: '800px',
              minHeight: '566px',
            }}
          >
            {/* Decorative Ornate Border */}
            <div className="absolute inset-4 border-4 border-double border-french-blue-400 rounded-lg" />
            <div className="absolute inset-6 border-2 border-french-blue-300 rounded-lg" />

            {/* Decorative solid lines - classic certificate style */}
            {/* Top decorative line */}
            <div className="absolute top-16 left-20 right-20 h-0.5 bg-gradient-to-r from-transparent via-french-blue-400 to-transparent opacity-70" />
            <div className="absolute top-20 left-24 right-24 h-px bg-gradient-to-r from-transparent via-french-blue-300 to-transparent opacity-50" />
            <div className="absolute top-24 left-16 right-16 h-0.5 bg-gradient-to-r from-transparent via-turquoise-surf-400 to-transparent opacity-60" />

            {/* Bottom decorative line */}
            <div className="absolute bottom-16 left-20 right-20 h-0.5 bg-gradient-to-r from-transparent via-french-blue-400 to-transparent opacity-70" />
            <div className="absolute bottom-20 left-24 right-24 h-px bg-gradient-to-r from-transparent via-french-blue-300 to-transparent opacity-50" />
            <div className="absolute bottom-24 left-16 right-16 h-0.5 bg-gradient-to-r from-transparent via-turquoise-surf-400 to-transparent opacity-60" />

            {/* Left decorative line */}
            <div className="absolute left-16 top-20 bottom-20 w-0.5 bg-gradient-to-b from-transparent via-french-blue-400 to-transparent opacity-70" />
            <div className="absolute left-20 top-24 bottom-24 w-px bg-gradient-to-b from-transparent via-french-blue-300 to-transparent opacity-50" />
            <div className="absolute left-24 top-16 bottom-16 w-0.5 bg-gradient-to-b from-transparent via-turquoise-surf-400 to-transparent opacity-60" />

            {/* Right decorative line */}
            <div className="absolute right-16 top-20 bottom-20 w-0.5 bg-gradient-to-b from-transparent via-french-blue-400 to-transparent opacity-70" />
            <div className="absolute right-20 top-24 bottom-24 w-px bg-gradient-to-b from-transparent via-french-blue-300 to-transparent opacity-50" />
            <div className="absolute right-24 top-16 bottom-16 w-0.5 bg-gradient-to-b from-transparent via-turquoise-surf-400 to-transparent opacity-60" />

            {/* Additional accent lines for elegance */}
            <div className="absolute top-32 left-32 right-32 border-t border-french-blue-200 opacity-40" />
            <div className="absolute bottom-32 left-32 right-32 border-t border-french-blue-200 opacity-40" />
            <div className="absolute left-32 top-32 bottom-32 border-l border-french-blue-200 opacity-40" />
            <div className="absolute right-32 top-32 bottom-32 border-l border-french-blue-200 opacity-40" />

            {/* Content */}
            <div className="relative z-10 text-center space-y-8">
              {/* Header */}
              <div>
                <div
                  style={{ paddingBottom: '20px' }}
                  className="inline-block px-6 py-2 bg-french-blue-600 text-white rounded-full mb-1"
                >
                  <span className="text-sm font-semibold tracking-wide">
                    {t('certView.certificate')}
                  </span>
                </div>
                <h1
                  className="text-4xl font text-gray-900 mb-2"
                  style={{ paddingBottom: '20px', fontFamily: 'Georgia, serif' }}
                >
                  {t('certView.courseCompletion')}
                </h1>
                <div className="w-32 h-1 bg-gradient-to-r from-french-blue-400 to-turquoise-surf-400 mx-auto rounded-full" />
              </div>

              {/* Recipient */}
              <div className="space-y-4">
                <p className="text-xl text-gray-600">{t('certView.presentedTo')}</p>
                <h2
                  className="text-4xl font-bold text-gray-900"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {certificate.student?.firstName} {certificate.student?.lastName}
                </h2>
              </div>

              {/* Course Info */}
              <div className="space-y-3">
                <p className="text-lg text-gray-600">{t('certView.successfullyCompleted')}</p>
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 max-w-2xl mx-auto shadow-lg">
                  <h3 className="text-2xl font-bold text-french-blue-700">
                    {certificate.course?.title}
                  </h3>
                </div>
              </div>

              {/* Footer Info */}
              <div className="pt-8 space-y-6">
                <div className="flex items-center justify-center gap-12 text-sm text-gray-600">
                  <div>
                    <p className="font-semibold mb-1">{t('certView.issueDate')}:</p>
                    <p>{formattedDate}</p>
                  </div>
                  <div className="h-12 w-px bg-gray-300" />
                  <div>
                    <p className="font-semibold mb-1">{t('certView.certId')}:</p>
                    <p className="font-mono text-french-blue-600">
                      {certificate.certificateId}
                    </p>
                  </div>
                </div>

                {/* Signature Line */}
                <div className="pt-8">
                  <div className="w-64 mx-auto border-t-2 border-gray-400 pt-2">
                    <p className="text-sm font-semibold text-gray-700">
                      {t('certView.platformName')}
                    </p>
                    <p className="text-xs text-gray-500">{t('certView.platformDesc')}</p>
                  </div>
                </div>
              </div>

              {/* Verification Link */}
              <div style={{ paddingTop: '20px' }}>
                <p className="text-xs text-gray-500">
                  {t('certView.verificationLink', {
                    url: `${window.location.origin}/certificates/verify/${certificate.certificateId}`,
                  })}
                </p>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-8 left-8 w-16 h-16 border-t-4 border-l-4 border-french-blue-300 rounded-tl-2xl" />
            <div className="absolute top-8 right-8 w-16 h-16 border-t-4 border-r-4 border-french-blue-300 rounded-tr-2xl" />
            <div className="absolute bottom-8 left-8 w-16 h-16 border-b-4 border-l-4 border-french-blue-300 rounded-bl-2xl" />
            <div className="absolute bottom-8 right-8 w-16 h-16 border-b-4 border-r-4 border-french-blue-300 rounded-br-2xl" />
          </div>
        </div>

        {/* Certificate Info */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('certView.about')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">{t('certView.student')}:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {certificate.student?.firstName} {certificate.student?.lastName}
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">{t('certView.email')}:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {certificate.student?.email}
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">{t('certView.course')}:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {certificate.course?.title}
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">{t('certView.issueDate')}:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {formattedDate}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateView;
