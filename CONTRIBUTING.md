# Contributing to TypeORM Transaction Helper

Thanks for your interest in contributing! 🎉

## Development Setup

1. **Fork and clone the repository**
```bash
git clone https://github.com/yourusername/typeorm-transaction-helper.git
cd typeorm-transaction-helper
```

2. **Install dependencies**
```bash
npm install
```

3. **Run tests**
```bash
npm test
npm run test:cov  # with coverage
```

4. **Build**
```bash
npm run build
```

## Making Changes

1. Create a new branch
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes
3. Add tests for your changes
4. Ensure all tests pass
5. Run linter and formatter
```bash
npm run lint
npm run format
```

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test changes
- `refactor:` - Code refactoring
- `chore:` - Build or tooling changes

Example:
```
feat: add retry logic for transactions
fix: handle connection timeout errors
docs: update README with new examples
```

## Pull Request Process

1. Update README.md with details of changes if needed
2. Update CHANGELOG.md following Keep a Changelog format
3. Ensure test coverage remains above 80%
4. The PR will be merged once you have approval

## Code Style

- Use TypeScript
- Follow existing code style
- Write clear comments for complex logic
- Add JSDoc comments for public APIs

## Testing

- Write unit tests for all new features
- Maintain minimum 80% code coverage
- Test both success and error cases

## Questions?

Feel free to open an issue for any questions!

Thank you for contributing! ❤️
