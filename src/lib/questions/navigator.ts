import { 
  VibeWorkspace, 
  QuestionModule, 
  QuestionSection, 
  Question,
  FollowUp
} from '../../types';

export class QuestionNavigator {
  private workspace: VibeWorkspace;
  private module: QuestionModule;

  constructor(workspace: VibeWorkspace, module: QuestionModule) {
    this.workspace = workspace;
    this.module = module;
  }

  getCurrentQuestion(): Question | null {
    const allVisible = this.getVisibleQuestions();
    const unanswered = allVisible.find(q => this.workspace.session.answers[q.id] === undefined);
    
    if (unanswered) {
      // Find which section this question belongs to for meta tracking
      const section = this.module.sections.find(s => {
        return s.questions.some(sq => this.isQuestionInTree(sq, unanswered.id));
      });
      
      if (section) {
        this.workspace.meta.currentSection = section.id;
      }
      this.workspace.meta.currentQuestion = unanswered.id;
      return unanswered;
    }

    return null; // All visible questions answered
  }

  private isQuestionInTree(root: Question, targetId: string): boolean {
    if (root.id === targetId) return true;
    if (root.follow_ups) {
      for (const fu of root.follow_ups) {
        if (fu.questions.some(fq => this.isQuestionInTree(fq, targetId))) {
          return true;
        }
      }
    }
    return false;
  }

  private getVisibleQuestions(): Question[] {
    const questions: Question[] = [];
    for (const section of this.module.sections) {
      if (!section.show_if || section.show_if(this.workspace.session.answers)) {
        for (const q of section.questions) {
          questions.push(...this.getQuestionAndVisibleFollowUps(q));
        }
      }
    }
    return questions;
  }

  private getQuestionAndVisibleFollowUps(q: Question): Question[] {
    const result: Question[] = [q];
    const answer = this.workspace.session.answers[q.id];
    
    if (answer !== undefined && q.follow_ups) {
      for (const fu of q.follow_ups) {
        if (fu.condition(answer, this.workspace)) {
          for (const fq of fu.questions) {
            result.push(...this.getQuestionAndVisibleFollowUps(fq));
          }
        }
      }
    }
    return result;
  }

  next(answer: any): Question | null {
    const currentQ = this.getCurrentQuestion();
    if (!currentQ) return null;

    // Save answer
    this.workspace.session.answers[currentQ.id] = answer;
    this.workspace.session.history.push({
        questionId: currentQ.id,
        answer: answer,
        timestamp: new Date()
    });
    this.workspace.meta.questionsAnswered++;

    return this.getCurrentQuestion();
  }

  back(): Question | null {
    if (this.workspace.session.history.length === 0) return this.getCurrentQuestion();

    const lastEntry = this.workspace.session.history.pop();
    if (lastEntry) {
        delete this.workspace.session.answers[lastEntry.questionId];
        this.workspace.meta.questionsAnswered--;
    }

    return this.getCurrentQuestion();
  }

  getProgress() {
    const visible = this.getVisibleQuestions();
    const answeredCount = visible.filter(q => this.workspace.session.answers[q.id] !== undefined).length;
    
    return {
      answered: answeredCount,
      total: visible.length,
      percentage: visible.length > 0 ? Math.round((answeredCount / visible.length) * 100) : 100
    };
  }

  isComplete(): boolean {
      return this.getCurrentQuestion() === null;
  }
}
