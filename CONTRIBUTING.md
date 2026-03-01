# Contributing to TypeORM Transaction Helper

First off, thanks for taking the time to contribute! 🎉

## How can I contribute?

### Reporting Bugs

Before creating bug reports, please check if the issue already exists.

When reporting a bug, include:

- **Clear description** of what the bug is
- **Steps to reproduce** the behavior
- **Expected behavior**
- **Actual behavior**
- **Environment**: Node version, TypeORM version, OS

### Suggesting Enhancements

Enhancement suggestions are welcome! Describe:

- **Use case** - What problem does it solve?
- **Expected behavior** - How should it work?
- **Possible implementation** - If you have ideas

### Pull Requests

1. **Fork** the repository
2. **Create a branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Add tests** for new functionality
5. **Run tests** (`npm test`)
6. **Commit** with a clear message (`git commit -m 'Add amazing feature'`)
7. **Push** to the branch (`git push origin feature/amazing-feature`)
8. **Open a Pull Request**

## Development Setup

```bash
# Clone the repository
git clone https://github.com/Hijiji/typeorm-transaction-helper.git
cd typeorm-transaction-helper

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Code Style

- Use **TypeScript** for all code
- Follow the existing code style
- Run `npm run format` to format your code
- Run `npm run lint` to check for errors

## Commit Messages

Please use clear and descriptive commit messages:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `test:` for tests
- `refactor:` for code refactoring
- `chore:` for maintenance

Example: `feat: add timeout support`

## Testing

- Write tests for new functionality
- Ensure all tests pass: `npm test`
- Maintain test coverage: `npm run test:cov`
- Tests should cover both success and error cases

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for exported functions
- Include code examples where helpful

## Questions?

Feel free to open an issue or discussion if you have questions!

Thank you for contributing! 🙏
