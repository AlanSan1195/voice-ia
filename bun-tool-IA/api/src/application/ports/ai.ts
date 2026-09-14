import type {
  InterviewContext,
  InterviewTurn,
  ProviderName,
  QuestionResult,
} from "../../domain/interview";
import type {
  FeedbackNarrative,
  TurnAssessment,
} from "../scoring/interview-scoring";

export type AiPayload =
  | {
      kind: "start";
      context: Omit<InterviewContext, "profile">;
      questionCount: number;
    }
  | {
      kind: "next";
      context: InterviewContext;
      turns: InterviewTurn[];
      questionCount: number;
    }
  | { kind: "feedback"; context: InterviewContext; turns: InterviewTurn[] }
  | {
      kind: "turnEvaluation";
      context: InterviewContext;
      question: string;
      answer: string;
      turnIndex: number;
    };

export type AiResult = {
  provider: ProviderName;
  value:
    | { profile: InterviewContext["profile"]; question: QuestionResult }
    | { question: QuestionResult }
    | FeedbackNarrative
    | TurnAssessment;
};
export interface AiProvider {
  readonly name: ProviderName;
  generate(payload: AiPayload): Promise<AiResult["value"]>;
}
export interface AiGateway {
  generate(payload: AiPayload): Promise<AiResult>;
}
