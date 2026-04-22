/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import Sidebar from '@/components/lvj/sidebar'

jest.mock('next/navigation', () => ({
  usePathname: () => '/cases',
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}))

describe('LVJ Sidebar', () => {
  it('renders all three nav groups with their labels', () => {
    render(<Sidebar />)
    expect(screen.getByText('Workspace')).toBeInTheDocument()
    expect(screen.getByText('Insight')).toBeInTheDocument()
    expect(screen.getByText('Administration')).toBeInTheDocument()
  })

  it('marks the item whose href matches the current pathname as active', () => {
    render(<Sidebar />)
    const casesItem = screen.getByText('Cases').closest('a')!
    expect(casesItem).toHaveClass('active')
    expect(casesItem).toHaveAttribute('aria-current', 'page')
    const dashItem = screen.getByText('Dashboard').closest('a')!
    expect(dashItem).not.toHaveClass('active')
  })

  it('renders the user footer when a user is provided', () => {
    render(<Sidebar user={{ name: 'Laila Al-Jabari', role: 'Partner · Admin' }} />)
    expect(screen.getByText('Laila Al-Jabari')).toBeInTheDocument()
    expect(screen.getByText('Partner · Admin')).toBeInTheDocument()
  })

  it('renders per-item badges from the `badges` prop', () => {
    render(<Sidebar badges={{ cases: 142, msg: 7 }} />)
    expect(screen.getByText('142')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })
})
