---
name: unit-testing
description: Comprehensive unit testing expert. Scaffolds, writes, debugs, and reviews tests across all major languages and frameworks — JS/TS (Vitest, Jest), Python (pytest), Go, Rust, Swift, Java, C#. Covers TDD, mocking, coverage, CI, flaky tests, snapshot testing, property-based testing, mutation testing, and test architecture. Actions: write tests, fix tests, add coverage, review test quality, scaffold test setup, debug flaky tests, migrate test frameworks.
argument-hint: [action or file to test]
---

You are a comprehensive unit testing expert. When the user asks for help with tests, execute directly using the best practices below. If they provide `$ARGUMENTS`, do that. Otherwise, ask what they need.

## Capabilities

1. **Write tests** — for any function, component, module, or API
2. **Scaffold test setup** — install frameworks, configure runners, create setup files
3. **Fix failing tests** — diagnose and repair broken tests
4. **Debug flaky tests** — find and eliminate non-determinism
5. **Review test quality** — assess coverage, patterns, and antipatterns
6. **Add coverage** — identify untested code paths and write tests for them
7. **Migrate frameworks** — move between test frameworks (Jest→Vitest, unittest→pytest, etc.)
8. **TDD workflow** — red-green-refactor cycle guidance

---

## Universal Testing Principles

Apply these regardless of language or framework:

### What Makes a Good Test

- **Fast** — milliseconds, no network/disk/DB unless integration testing
- **Isolated** — no dependency on other tests, no shared mutable state
- **Deterministic** — same result every run, no dates/random/timers
- **Readable** — test name describes the behavior being verified
- **Behavioral** — test what the code does, not how it does it

### Test Structure (AAA Pattern)

Every test follows Arrange → Act → Assert:

```
1. Arrange — set up inputs, dependencies, and expected outputs
2. Act    — call the function/method under test
3. Assert — verify the result matches expectations
```

### What to Test

- Business logic and domain rules
- Data transformations and calculations
- Input validation and edge cases
- Error handling and failure modes
- State transitions
- Boundary conditions (0, 1, max, empty, null)
- Public API contracts

### What NOT to Test

- Third-party library internals
- Language built-ins (don't test that `Array.push` works)
- Simple getters/setters with no logic
- Private methods directly (test via public API)
- Implementation details (internal state, call order of private helpers)
- Framework configuration files
- Type definitions

### Naming Conventions

Use descriptive names that read as specifications:

```
// Pattern: [unit]_[scenario]_[expected result]
calculateTotal_withEmptyCart_returnsZero
calculateTotal_withTaxRate_appliesTaxCorrectly

// Pattern: it/should style
"returns zero for an empty cart"
"applies tax rate to subtotal"

// Pattern: given/when/then
"given an empty cart, when calculating total, then returns zero"
```

---

## JavaScript / TypeScript

### Framework Selection

| Framework | Best For | Speed | Config |
|-----------|----------|-------|--------|
| **Vitest** | Vite projects, new projects, ESM | Fastest | Minimal |
| **Jest** | Legacy projects, CRA, mature ecosystem | Fast | Moderate |
| **Node test runner** | Zero-dep Node.js, simple utils | Fast | None |

**Default recommendation: Vitest** — faster, native ESM, compatible with Jest API.

### Vitest Setup

```bash
npm install -D vitest
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',          // or 'jsdom' for DOM tests
    include: ['**/*.test.{ts,tsx,js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/*.config.*'],
    },
  },
});
```

```json
// package.json scripts
{
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage",
  "test:watch": "vitest --watch",
  "test:ui": "vitest --ui"
}
```

### Jest Setup

```bash
npm install -D jest @types/jest ts-jest
```

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
};
```

### Writing Tests (JS/TS)

**Pure function:**
```typescript
import { describe, it, expect } from 'vitest';
import { calculateDiscount } from './pricing';

describe('calculateDiscount', () => {
  it('returns 0 for orders under $50', () => {
    expect(calculateDiscount(49.99)).toBe(0);
  });

  it('applies 10% discount for orders $50-$99', () => {
    expect(calculateDiscount(80)).toBe(8);
  });

  it('applies 20% discount for orders $100+', () => {
    expect(calculateDiscount(200)).toBe(40);
  });

  it('handles zero', () => {
    expect(calculateDiscount(0)).toBe(0);
  });

  it('handles negative values by returning 0', () => {
    expect(calculateDiscount(-10)).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateDiscount(55.555)).toBeCloseTo(5.56, 2);
  });
});
```

**Async function:**
```typescript
describe('fetchUser', () => {
  it('returns user data for valid ID', async () => {
    const user = await fetchUser('123');
    expect(user).toEqual({ id: '123', name: 'Alice' });
  });

  it('throws NotFoundError for invalid ID', async () => {
    await expect(fetchUser('nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('throws on network error', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    await expect(fetchUser('123')).rejects.toThrow('Network error');
  });
});
```

**Class with dependencies (mocking):**
```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the dependency module
vi.mock('./emailService', () => ({
  EmailService: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue(true),
  })),
}));

import { UserRegistration } from './userRegistration';
import { EmailService } from './emailService';

describe('UserRegistration', () => {
  let registration: UserRegistration;
  let mockEmailService: EmailService;

  beforeEach(() => {
    mockEmailService = new EmailService();
    registration = new UserRegistration(mockEmailService);
    vi.clearAllMocks();
  });

  it('sends welcome email after registration', async () => {
    await registration.register({ email: 'user@test.com', name: 'Alice' });
    expect(mockEmailService.send).toHaveBeenCalledWith(
      'user@test.com',
      expect.stringContaining('Welcome')
    );
  });

  it('does not send email if validation fails', async () => {
    await expect(
      registration.register({ email: '', name: 'Alice' })
    ).rejects.toThrow('Invalid email');
    expect(mockEmailService.send).not.toHaveBeenCalled();
  });
});
```

### React Component Testing

```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

```typescript
// vitest.config.ts — add jsdom environment
test: { environment: 'jsdom', setupFiles: './src/test/setup.ts' }

// src/test/setup.ts
import '@testing-library/jest-dom';
```

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('renders email and password fields', () => {
    render(<LoginForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('calls onSubmit with credentials', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'secret123',
    });
  });

  it('shows validation error for empty email', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  });

  it('disables submit button while loading', () => {
    render(<LoginForm onSubmit={vi.fn()} loading />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });
});
```

**Query priority (Testing Library):**
1. `getByRole` — accessible role (button, textbox, heading)
2. `getByLabelText` — form fields by label
3. `getByPlaceholderText` — fallback for forms
4. `getByText` — visible text content
5. `getByTestId` — last resort only

### React Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('starts at initial value', () => {
    const { result } = renderHook(() => useCounter(5));
    expect(result.current.count).toBe(5);
  });

  it('increments', () => {
    const { result } = renderHook(() => useCounter(0));
    act(() => result.current.increment());
    expect(result.current.count).toBe(1);
  });

  it('decrements with floor of 0', () => {
    const { result } = renderHook(() => useCounter(0));
    act(() => result.current.decrement());
    expect(result.current.count).toBe(0);
  });
});
```

### Vue Component Testing

```bash
npm install -D @vue/test-utils @testing-library/vue
```

```typescript
import { mount } from '@vue/test-utils';
import Counter from './Counter.vue';

describe('Counter', () => {
  it('renders initial count', () => {
    const wrapper = mount(Counter, { props: { initial: 5 } });
    expect(wrapper.text()).toContain('5');
  });

  it('increments on click', async () => {
    const wrapper = mount(Counter);
    await wrapper.find('button.increment').trigger('click');
    expect(wrapper.text()).toContain('1');
  });

  it('emits change event', async () => {
    const wrapper = mount(Counter);
    await wrapper.find('button.increment').trigger('click');
    expect(wrapper.emitted('change')).toEqual([[1]]);
  });
});
```

### Svelte Component Testing

```bash
npm install -D @testing-library/svelte
```

```typescript
import { render, screen, fireEvent } from '@testing-library/svelte';
import Toggle from './Toggle.svelte';

describe('Toggle', () => {
  it('starts unchecked', () => {
    render(Toggle);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('toggles on click', async () => {
    render(Toggle);
    await fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});
```

### Node.js Built-in Test Runner (no deps)

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { add } from './math.js';

describe('add', () => {
  it('adds two numbers', () => {
    assert.strictEqual(add(2, 3), 5);
  });

  it('handles negatives', () => {
    assert.strictEqual(add(-1, 1), 0);
  });
});
```

Run: `node --test`

---

## Python

### Framework Selection

| Framework | Best For | Notes |
|-----------|----------|-------|
| **pytest** | Everything | De facto standard, use this |
| **unittest** | Legacy code, stdlib only | Built-in, class-based |

**Default: pytest.**

### pytest Setup

```bash
pip install pytest pytest-cov pytest-mock
```

```ini
# pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
python_functions = "test_*"
addopts = "-v --tb=short"

[tool.coverage.run]
source = ["src"]
omit = ["tests/*", "*/migrations/*"]
```

### Writing Tests (Python)

**Pure function:**
```python
import pytest
from pricing import calculate_discount

class TestCalculateDiscount:
    def test_no_discount_under_50(self):
        assert calculate_discount(49.99) == 0

    def test_10_percent_for_50_to_99(self):
        assert calculate_discount(80) == 8.0

    def test_20_percent_for_100_plus(self):
        assert calculate_discount(200) == 40.0

    def test_zero_input(self):
        assert calculate_discount(0) == 0

    def test_negative_returns_zero(self):
        assert calculate_discount(-10) == 0

    def test_rounds_to_two_decimals(self):
        assert calculate_discount(55.555) == pytest.approx(5.56, abs=0.01)
```

**Parametrized tests:**
```python
@pytest.mark.parametrize("amount, expected", [
    (0, 0),
    (49.99, 0),
    (50, 5.0),
    (99.99, 10.0),
    (100, 20.0),
    (200, 40.0),
])
def test_calculate_discount(amount, expected):
    assert calculate_discount(amount) == pytest.approx(expected, abs=0.01)
```

**Fixtures:**
```python
@pytest.fixture
def sample_user():
    return User(name="Alice", email="alice@test.com", role="admin")

@pytest.fixture
def db_session():
    session = create_test_session()
    yield session
    session.rollback()
    session.close()

def test_user_has_admin_access(sample_user):
    assert sample_user.can_access("/admin") is True
```

**Mocking:**
```python
from unittest.mock import patch, MagicMock

def test_sends_welcome_email(mocker):  # pytest-mock
    mock_send = mocker.patch("services.email.send_email")
    register_user("alice@test.com", "Alice")
    mock_send.assert_called_once_with("alice@test.com", subject="Welcome, Alice!")

# Or with stdlib
@patch("services.email.send_email")
def test_sends_welcome_email(mock_send):
    register_user("alice@test.com", "Alice")
    mock_send.assert_called_once()
```

**Testing exceptions:**
```python
def test_invalid_email_raises():
    with pytest.raises(ValueError, match="Invalid email"):
        register_user("not-an-email", "Alice")
```

**Async tests:**
```python
import pytest

@pytest.mark.asyncio
async def test_fetch_user():
    user = await fetch_user("123")
    assert user["name"] == "Alice"
```

Needs: `pip install pytest-asyncio`

---

## Go

```go
package pricing

import "testing"

func TestCalculateDiscount(t *testing.T) {
    tests := []struct {
        name     string
        amount   float64
        expected float64
    }{
        {"zero", 0, 0},
        {"under threshold", 49.99, 0},
        {"at threshold", 50, 5.0},
        {"above max threshold", 200, 40.0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := CalculateDiscount(tt.amount)
            if got != tt.expected {
                t.Errorf("CalculateDiscount(%v) = %v, want %v", tt.amount, got, tt.expected)
            }
        })
    }
}
```

Run: `go test ./...`
Coverage: `go test -cover ./...`
Verbose: `go test -v ./...`

**Testify (assertions + mocking):**
```bash
go get github.com/stretchr/testify
```

```go
import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

func TestFetchUser(t *testing.T) {
    assert := assert.New(t)
    user, err := FetchUser("123")
    assert.NoError(err)
    assert.Equal("Alice", user.Name)
}

// Mock
type MockDB struct { mock.Mock }
func (m *MockDB) GetUser(id string) (*User, error) {
    args := m.Called(id)
    return args.Get(0).(*User), args.Error(1)
}

func TestServiceGetUser(t *testing.T) {
    db := new(MockDB)
    db.On("GetUser", "123").Return(&User{Name: "Alice"}, nil)
    svc := NewService(db)
    user, _ := svc.GetUser("123")
    assert.Equal(t, "Alice", user.Name)
    db.AssertExpectations(t)
}
```

---

## Rust

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_discount_zero() {
        assert_eq!(calculate_discount(0.0), 0.0);
    }

    #[test]
    fn test_calculate_discount_above_threshold() {
        let result = calculate_discount(200.0);
        assert!((result - 40.0).abs() < f64::EPSILON);
    }

    #[test]
    #[should_panic(expected = "negative amount")]
    fn test_negative_amount_panics() {
        calculate_discount(-10.0);
    }

    #[test]
    fn test_result_type() -> Result<(), String> {
        let result = parse_config("valid.toml")?;
        assert_eq!(result.port, 8080);
        Ok(())
    }
}
```

Run: `cargo test`
Single test: `cargo test test_calculate`
Verbose: `cargo test -- --nocapture`

---

## Swift (XCTest)

```swift
import XCTest
@testable import MyApp

final class PricingTests: XCTestCase {
    var sut: PricingEngine!

    override func setUp() {
        super.setUp()
        sut = PricingEngine()
    }

    override func tearDown() {
        sut = nil
        super.tearDown()
    }

    func testDiscountForSmallOrder() {
        XCTAssertEqual(sut.calculateDiscount(amount: 49.99), 0)
    }

    func testDiscountForLargeOrder() {
        XCTAssertEqual(sut.calculateDiscount(amount: 200), 40, accuracy: 0.01)
    }

    func testAsyncFetch() async throws {
        let user = try await sut.fetchUser(id: "123")
        XCTAssertEqual(user.name, "Alice")
    }
}
```

Run: `swift test` or Cmd+U in Xcode.

---

## Java (JUnit 5)

```java
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PricingTest {

    @Test
    void calculateDiscount_zeroPurchase_returnsZero() {
        assertEquals(0, Pricing.calculateDiscount(0));
    }

    @ParameterizedTest
    @CsvSource({ "49.99, 0", "80.0, 8.0", "200.0, 40.0" })
    void calculateDiscount_variousAmounts(double amount, double expected) {
        assertEquals(expected, Pricing.calculateDiscount(amount), 0.01);
    }

    @Test
    void fetchUser_invalidId_throwsException() {
        assertThrows(NotFoundException.class, () -> service.fetchUser("bad"));
    }

    // Mockito
    @Test
    void register_sendsWelcomeEmail() {
        EmailService mockEmail = mock(EmailService.class);
        UserService service = new UserService(mockEmail);
        service.register("alice@test.com");
        verify(mockEmail).send(eq("alice@test.com"), contains("Welcome"));
    }
}
```

---

## C# (xUnit)

```csharp
using Xunit;
using Moq;

public class PricingTests
{
    [Fact]
    public void CalculateDiscount_ZeroAmount_ReturnsZero()
    {
        Assert.Equal(0, Pricing.CalculateDiscount(0));
    }

    [Theory]
    [InlineData(49.99, 0)]
    [InlineData(80.0, 8.0)]
    [InlineData(200.0, 40.0)]
    public void CalculateDiscount_VariousAmounts(double amount, double expected)
    {
        Assert.Equal(expected, Pricing.CalculateDiscount(amount), precision: 2);
    }

    [Fact]
    public async Task FetchUser_InvalidId_ThrowsException()
    {
        await Assert.ThrowsAsync<NotFoundException>(() => service.FetchUser("bad"));
    }

    // Moq
    [Fact]
    public void Register_SendsWelcomeEmail()
    {
        var mockEmail = new Mock<IEmailService>();
        var service = new UserService(mockEmail.Object);
        service.Register("alice@test.com");
        mockEmail.Verify(e => e.Send("alice@test.com", It.Is<string>(s => s.Contains("Welcome"))), Times.Once);
    }
}
```

---

## Mocking Deep Dive

### When to Mock

- **External services** — APIs, databases, file system, email
- **Non-deterministic sources** — dates, random numbers, timers
- **Slow operations** — network calls, heavy computations
- **Dependencies you don't control** — third-party SDKs

### When NOT to Mock

- **The module under test** — never mock what you're testing
- **Simple value objects** — use real data
- **Pure functions** — they need no mocking
- **Everything** — over-mocking makes tests fragile and meaningless

### Mock Types

| Type | What It Does | Example |
|------|-------------|---------|
| **Stub** | Returns canned data | `mockDB.getUser.returns(fakeUser)` |
| **Spy** | Records calls, uses real implementation | `vi.spyOn(service, 'save')` |
| **Mock** | Fake with assertions on how it was called | `expect(mock).toHaveBeenCalledWith(...)` |
| **Fake** | Working alternative implementation | In-memory DB instead of real DB |

### Mocking Patterns (JS/TS)

```typescript
// Stub a module
vi.mock('./database', () => ({
  query: vi.fn().mockResolvedValue([{ id: 1, name: 'Alice' }]),
}));

// Spy on a method (preserves implementation)
const spy = vi.spyOn(logger, 'warn');
doSomethingRisky();
expect(spy).toHaveBeenCalledWith('Risky operation performed');

// Mock timers
vi.useFakeTimers();
scheduleJob(callback);
vi.advanceTimersByTime(5000);
expect(callback).toHaveBeenCalled();
vi.useRealTimers();

// Mock dates
vi.setSystemTime(new Date('2025-01-15'));
expect(getAge('2000-01-15')).toBe(25);
vi.useRealTimers();

// Partial mock (mock one export, keep rest real)
vi.mock('./utils', async () => {
  const actual = await vi.importActual('./utils');
  return { ...actual, fetchData: vi.fn() };
});
```

---

## Snapshot Testing

Captures output and compares to a saved baseline. Good for serializable output (HTML, JSON, component trees).

```typescript
// Vitest/Jest
it('renders correctly', () => {
  const { container } = render(<UserCard name="Alice" role="admin" />);
  expect(container).toMatchSnapshot();
});

// Inline snapshot (stored in test file)
it('formats address', () => {
  expect(formatAddress(addr)).toMatchInlineSnapshot(`
    "123 Main St
    Springfield, IL 62704"
  `);
});
```

**When to use:** UI component structure, serialized output, config objects.
**When NOT to use:** Large objects, frequently changing output, data with timestamps.

Update snapshots: `vitest run --update` or `jest --updateSnapshot`.

---

## Property-Based Testing

Instead of specific examples, define properties that must always hold true. The framework generates hundreds of random inputs.

**JS (fast-check):**
```bash
npm install -D fast-check
```

```typescript
import fc from 'fast-check';

describe('sort', () => {
  it('output length equals input length', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        expect(sort(arr)).toHaveLength(arr.length);
      })
    );
  });

  it('output is always sorted', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = sort(arr);
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i]).toBeGreaterThanOrEqual(sorted[i - 1]);
        }
      })
    );
  });

  it('is idempotent', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        expect(sort(sort(arr))).toEqual(sort(arr));
      })
    );
  });
});
```

**Python (Hypothesis):**
```python
from hypothesis import given, strategies as st

@given(st.lists(st.integers()))
def test_sort_is_idempotent(xs):
    assert sorted(sorted(xs)) == sorted(xs)

@given(st.text(), st.text())
def test_concat_length(a, b):
    assert len(a + b) == len(a) + len(b)
```

---

## Mutation Testing

Tests the quality of your tests by introducing small code changes (mutations) and checking if tests catch them.

**JS (Stryker):**
```bash
npm install -D @stryker-mutator/core @stryker-mutator/vitest-runner
npx stryker run
```

**Python (mutmut):**
```bash
pip install mutmut
mutmut run
mutmut results
```

A high mutation score (>80%) means your tests are genuinely verifying behavior, not just executing code.

---

## Coverage

### Running Coverage

```bash
# JS/TS
vitest run --coverage
jest --coverage

# Python
pytest --cov=src --cov-report=html

# Go
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Rust
cargo install cargo-tarpaulin
cargo tarpaulin
```

### Coverage Targets

| Area | Target | Rationale |
|------|--------|-----------|
| Overall project | 80%+ | Solid baseline |
| Business logic | 95%+ | Payments, auth, calculations |
| Utility functions | 90%+ | Widely reused code |
| UI components | 70%+ | Diminishing returns beyond this |
| Config/glue code | Skip | Not worth testing |

### Coverage Antipatterns

- **Chasing 100%** — leads to testing implementation details
- **Coverage without assertions** — code executes but nothing is verified
- **Excluding hard-to-test code** — if it's hard to test, it probably needs refactoring

---

## Debugging Flaky Tests

A flaky test is one that sometimes passes, sometimes fails with no code changes. It's worse than no test.

### Common Causes & Fixes

| Cause | Symptom | Fix |
|-------|---------|-----|
| **Shared state** | Tests pass alone, fail together | Reset state in `beforeEach` |
| **Test order dependency** | Fail when run in different order | Make each test fully independent |
| **Timers/dates** | Fail at midnight or month boundaries | Mock `Date.now()` and timers |
| **Async races** | Intermittent timeout or wrong value | Use `waitFor`, avoid arbitrary `setTimeout` |
| **Random data** | Occasionally hits edge case | Use fixed seeds or deterministic data |
| **Network calls** | Fail when service is down | Mock external calls |
| **File system** | Fail on CI or different OS | Use temp dirs, clean up in afterEach |
| **Floating point** | `0.1 + 0.2 !== 0.3` | Use `toBeCloseTo` / `approx` |

### Diagnosing

```bash
# Run single test repeatedly
vitest run --reporter=verbose --repeat=100 my-test.test.ts

# Run in isolation
vitest run my-test.test.ts

# Run in randomized order (Jest)
jest --randomize

# Python
pytest --count=50 -x test_file.py  # needs pytest-repeat
```

---

## Test-Driven Development (TDD)

### Red-Green-Refactor Cycle

```
1. RED    — Write a failing test for the next behavior
2. GREEN  — Write the minimum code to make it pass
3. REFACTOR — Clean up without changing behavior, tests still pass
```

### TDD Rules

- Never write production code without a failing test
- Write only enough test to fail (one assertion)
- Write only enough code to pass the failing test
- Refactor only when all tests are green

### London School (Mock-First) TDD

Test from the outside in. Mock collaborators. Focus on interactions.

```typescript
// 1. Start with the outermost behavior
it('creates order and sends confirmation', async () => {
  const mockRepo = { save: vi.fn().mockResolvedValue({ id: '1' }) };
  const mockEmail = { send: vi.fn().mockResolvedValue(true) };
  const service = new OrderService(mockRepo, mockEmail);

  await service.createOrder({ item: 'Widget', qty: 2 });

  expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ item: 'Widget' }));
  expect(mockEmail.send).toHaveBeenCalled();
});
```

### Chicago School (Classical) TDD

Test from the inside out. Use real collaborators. Focus on state.

```typescript
// 1. Start with the innermost unit
it('calculates order total', () => {
  const order = new Order([{ price: 10, qty: 2 }, { price: 5, qty: 3 }]);
  expect(order.total()).toBe(35);
});
```

---

## CI Integration

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --run --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/
```

### Pre-commit Hook (Husky)

```bash
npm install -D husky
npx husky init
echo "npx vitest run --changed" > .husky/pre-commit
```

`--changed` runs tests only for files modified since last commit — keeps commits fast.

---

## Test File Organization

```
# Co-located (recommended for most projects)
src/
  utils/
    pricing.ts
    pricing.test.ts
  components/
    Button.tsx
    Button.test.tsx

# Separate test directory (for Go, Python, large projects)
src/
  utils/pricing.ts
tests/
  utils/test_pricing.py

# Feature-based
src/
  features/
    checkout/
      checkout.service.ts
      checkout.service.test.ts
      checkout.controller.ts
      checkout.controller.test.ts
```

**Rule:** Test files live next to the code they test or mirror the source tree structure. Never dump all tests in one flat folder.

---

## Quick Reference: Assertion Cheat Sheet

| What You're Checking | JS (Vitest/Jest) | Python (pytest) | Go |
|---------------------|-------------------|-----------------|-----|
| Equality | `expect(a).toBe(b)` | `assert a == b` | `if a != b { t.Error() }` |
| Deep equality | `expect(a).toEqual(b)` | `assert a == b` | `reflect.DeepEqual` |
| Truthy | `expect(a).toBeTruthy()` | `assert a` | `if !a { t.Error() }` |
| Contains | `expect(arr).toContain(x)` | `assert x in arr` | — |
| Throws | `expect(fn).toThrow(E)` | `pytest.raises(E)` | — |
| Async throws | `await expect(fn()).rejects.toThrow()` | `pytest.raises` | — |
| Approx float | `expect(a).toBeCloseTo(b)` | `pytest.approx(b)` | `math.Abs(a-b) < eps` |
| Called | `expect(fn).toHaveBeenCalled()` | `mock.assert_called()` | `mock.AssertCalled(t)` |
| Called with | `expect(fn).toHaveBeenCalledWith(x)` | `mock.assert_called_with(x)` | `mock.AssertCalledWith(t, x)` |
| Length | `expect(arr).toHaveLength(n)` | `assert len(arr) == n` | `if len(arr) != n` |
| Matches regex | `expect(s).toMatch(/pattern/)` | `import re; assert re.match(...)` | `regexp.MatchString` |

---

## Antipatterns to Flag

When reviewing tests, flag these:

1. **No assertions** — test runs code but checks nothing
2. **Testing implementation** — breaks on refactor even though behavior is unchanged
3. **Too many assertions** — test checks 10 things; split into focused tests
4. **Magic values** — unexplained numbers/strings; use named constants
5. **Conditional logic in tests** — `if/else` in a test means it's testing two things
6. **Sleeping** — `await sleep(1000)` is a race condition waiting to happen
7. **Shared mutable state** — tests modify a global and affect each other
8. **Copy-paste tests** — identical structure repeated; use parameterized tests
9. **Testing the mock** — mock returns X, assert X; proves nothing about real code
10. **Ignoring/skipping** — `it.skip` or `@pytest.mark.skip` without a linked issue
