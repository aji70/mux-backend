import { Injectable, Logger } from '@nestjs/common';

const MAX_SERIES_PER_METRIC = 1000;
const DROPPED_SERIES_METRIC = 'metrics_series_dropped_total';

interface MetricSeries {
  labels: Record<string, string>;
  value: number;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  private readonly counters = new Map<string, MetricSeries>();
  private readonly histograms = new Map<string, MetricSeries>();

  incrementCounter(
    name: string,
    value = 1,
    labels?: Record<string, string>,
  ): void {
    this.record(this.counters, name, value, labels);
  }

  recordHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    this.record(this.histograms, name, value, labels);
  }

  render(): string {
    const lines: string[] = [];

    for (const [key, series] of this.counters) {
      lines.push(this.formatLine(key, series));
    }

    for (const [key, series] of this.histograms) {
      lines.push(this.formatLine(key, series));
    }

    return lines.length > 0 ? `${lines.join('\n')}\n` : '';
  }

  private record(
    registry: Map<string, MetricSeries>,
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    const sanitizedName = sanitizeLabel(name);
    const sanitizedLabels = sanitizeLabels(labels);
    const key = seriesKey(sanitizedName, sanitizedLabels);

    const existing = registry.get(key);
    if (existing) {
      existing.value += value;
      return;
    }

    if (registry.size >= MAX_SERIES_PER_METRIC) {
      this.incrementDroppedSeries();
      this.logger.debug(
        `Dropped metric series for ${sanitizedName}: series cap of ${MAX_SERIES_PER_METRIC} reached`,
      );
      return;
    }

    registry.set(key, { labels: sanitizedLabels, value });
  }

  private incrementDroppedSeries(): void {
    const key = seriesKey(DROPPED_SERIES_METRIC, {});
    const existing = this.counters.get(key);

    if (existing) {
      existing.value += 1;
      return;
    }

    this.counters.set(key, { labels: {}, value: 1 });
  }

  private formatLine(key: string, series: MetricSeries): string {
    const name = key.split('|')[0];
    const labelEntries = Object.entries(series.labels);

    if (labelEntries.length === 0) {
      return `${name} ${series.value}`;
    }

    const rendered = labelEntries
      .map(([label, labelValue]) => `${label}="${labelValue}"`)
      .join(',');

    return `${name}{${rendered}} ${series.value}`;
  }
}

function sanitizeLabels(
  labels?: Record<string, string>,
): Record<string, string> {
  if (!labels) {
    return {};
  }

  const sanitized: Record<string, string> = {};
  for (const label of Object.keys(labels).sort()) {
    sanitized[sanitizeLabel(label)] = sanitizeLabel(String(labels[label]));
  }

  return sanitized;
}

function seriesKey(
  name: string,
  labels: Record<string, string>,
): string {
  const pairs = Object.keys(labels)
    .sort()
    .map((label) => `${label}="${labels[label]}"`)
    .join(',');

  return `${name}|${pairs}`;
}

function sanitizeLabel(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, '_');
}
