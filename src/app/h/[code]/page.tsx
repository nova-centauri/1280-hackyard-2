import App from '@/components/App';

export default async function SharedPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <App loadCode={code} />;
}
