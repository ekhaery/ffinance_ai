import TemplateForm from '@/lib/TemplateForm'

export default function CreateTemplatePage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Create Template</h1>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <TemplateForm />
        </div>
      </div>
    </main>
  )
}
