import { ConfigDrivenAnalysisStrategy } from './ConfigDrivenAnalysisStrategy';

export class KpssAnalysisStrategy extends ConfigDrivenAnalysisStrategy {
  constructor() {
    super('kpss');
  }
}
