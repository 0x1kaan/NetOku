import { ConfigDrivenAnalysisStrategy } from './ConfigDrivenAnalysisStrategy';

export class InstitutionThreeCourseStrategy extends ConfigDrivenAnalysisStrategy {
  constructor() {
    super('institution-3x20');
  }
}
