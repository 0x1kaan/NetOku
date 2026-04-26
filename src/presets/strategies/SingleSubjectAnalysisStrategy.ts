import { ConfigDrivenAnalysisStrategy } from './ConfigDrivenAnalysisStrategy';

export class SingleSubjectAnalysisStrategy extends ConfigDrivenAnalysisStrategy {
  constructor() {
    super('single-subject');
  }
}
