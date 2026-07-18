export const DEMO_PROJECT_PURGER = Symbol('DemoProjectPurger');

export interface DemoProjectPurger {
  purgeDemoProjects(): Promise<void>;
}
