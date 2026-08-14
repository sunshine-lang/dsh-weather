import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { getWeather, type WeatherConfig } from './weather.js'

export const name = 'dsh-weather'

export const inject = ['tools']

/** Deployment-tunable weather behavior. */
export interface Config {
  /** Temperature unit applied when the model omits `units`. */
  defaultUnits: 'celsius' | 'fahrenheit'
  /** Timeout for each weather API call, in milliseconds. */
  timeoutMs: number
  /** Upper bound for the `days` forecast parameter. */
  maxForecastDays: number
}

/** Schemastery configuration: validates on load and fills defaults. */
export const Config: z<Config> = z.object({
  defaultUnits: z.union(['celsius', 'fahrenheit']).default('celsius'),
  timeoutMs: z.natural().min(1).default(10_000),
  maxForecastDays: z.natural().min(1).max(7).default(7),
})

export function apply(ctx: Context, config: Config) {
  // Required dependencies (tools) are ready before apply runs.
  console.log('[dsh-weather] plugin loaded!')

  const weatherConfig: WeatherConfig = {
    defaultUnits: config.defaultUnits,
    timeoutMs: config.timeoutMs,
    maxForecastDays: config.maxForecastDays,
  }

  ctx.tools.register(defineTool({
    name: 'get_weather',
    description: 'Get the current weather for a city or place, e.g. "Shanghai" or "Tokyo", plus an optional multi-day forecast.',
    parameters: {
      location: { type: 'string', required: true, description: 'City name or place name' },
      units: {
        type: 'string',
        description: 'Temperature unit; omit to use the configured default',
        enum: ['celsius', 'fahrenheit'],
      },
      days: {
        type: 'integer',
        description: 'Forecast days to include, from 1 to 7; 1 (default) means current conditions only',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    execute: args => getWeather(args, weatherConfig),
  }))
}
