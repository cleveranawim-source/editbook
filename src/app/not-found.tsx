import { AuthCard } from "@/components/AuthCard";
import { ButtonLink } from "@/components/Button";

export default function NotFound() {
  return (
    <AuthCard title="페이지를 찾을 수 없습니다" lead="주소가 잘못되었거나 볼 수 있는 권한이 없습니다.">
      <ButtonLink href="/books" variant="primary" className="w-full">
        내 책으로 가기
      </ButtonLink>
    </AuthCard>
  );
}
