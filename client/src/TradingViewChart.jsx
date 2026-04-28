import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, CrosshairMode } from 'lightweight-charts';

const TradingViewChart = ({ data, volumeData }) => {
  const chartContainerRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: '#0b0e14' }, // Dark theme autentic
        textColor: '#848e9c',
      },
      grid: {
        vertLines: { color: 'rgba(43, 49, 57, 0.5)', style: 1 },
        horzLines: { color: 'rgba(43, 49, 57, 0.5)', style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#848e9c', width: 1, style: 3, labelBackgroundColor: '#3b82f6' },
        horzLine: { color: '#848e9c', width: 1, style: 3, labelBackgroundColor: '#3b82f6' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: '#2b3139',
        rightOffset: 12, 
        barSpacing: 15, 
      },
      rightPriceScale: {
        borderColor: '#2b3139',
        autoScale: true,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#2ebd85',      
      downColor: '#f6465d',    
      borderVisible: false,
      wickUpColor: '#2ebd85',
      wickDownColor: '#f6465d',
    });
    candlestickSeries.setData(data);

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '', 
    });
    
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeries.setData(volumeData);

    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ 
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, volumeData]);

  return <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />;
};

export default TradingViewChart;