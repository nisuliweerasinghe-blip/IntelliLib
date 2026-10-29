import { useRef, useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

function Scanner({ onScan }) {
  const scannerRef = useRef(null);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const stop = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setActive(false);

    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
      }
    }
  };

  const start = async () => {
    setError('');
    setStarting(true);

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          if (!scannerRef.current) return;
          stop();
          onScan(decodedText);
        },
        () => {}
      );
      setActive(true);
    } catch (err) {
      scannerRef.current = null;
      setError('The camera could not start. Allow camera access in your browser, or enter the book ID below.');
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      }
    };
  }, []);

  return (
    <div className="scanner">
      <div className="scanner-frame">
        <div id="qr-reader" />

        <div className="scanner-actions">
          {active ? (
            <button className="btn-line" type="button" onClick={stop}>
              Stop camera
            </button>
          ) : (
            <button className="btn-solid" type="button" onClick={start} disabled={starting}>
              {starting ? 'Starting...' : 'Start camera'}
            </button>
          )}
          <p className="scanner-hint">
            {active ? 'Hold the QR code inside the frame.' : 'Scan the QR code on the book.'}
          </p>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}

export default Scanner;