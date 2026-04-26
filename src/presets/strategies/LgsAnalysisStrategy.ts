import { ConfigDrivenAnalysisStrategy } from './ConfigDrivenAnalysisStrategy';

export class LgsAnalysisStrategy extends ConfigDrivenAnalysisStrategy {
  constructor() {
    super('lgs');
  }
}
