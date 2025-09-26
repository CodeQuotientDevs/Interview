const { createResumeRoute } = require('./entry-points/resume.route');
const { formidable } = require('formidable');
const fileUpload = formidable({
    allowEmptyFiles: false,
    filename: (name, ext, part, form) => {
        return `${name}-${Date.now()}.${ext}`;
    },
    fileWriteStreamHandler: (file, uploadPromiseArray) => {
        const body = new stream.PassThrough();
        const fileWriteStream = fs.createWriteStream(file.filepath); // Ensure the file path is correct
    
        body.pipe(fileWriteStream);
    
        uploadPromiseArray.push(new Promise((resolve, reject) => {
            let isResolved = false;
            fileWriteStream.on('finish', () => {
                file.location = `${lib.utils.hostUrl()}/uploads/${file.prefixLocation?`${file.prefixLocation}/`:''}${file.newFilename}`
                if (!isResolved) {
                    isResolved = true;
                    resolve();
                }
            });
    
            fileWriteStream.on('error', (error) => {
                if (!isResolved) {
                    isResolved = true;
                    reject(error);
                }
            });
        }));
        return body;
    }
});

const fileUploadHandler = (req, res, next) => {
    form.parse(req, (error, fields, files) => {
        if (error) {
            return res.status(500).json({error: error?.message ?? error});
        }
        Promise.all(uploadPromiseArray)
        .then(() => {
            req.body = fields;
            req.files = [];
            Object.values(files).forEach((files) => {
                files.forEach((file) => {
                    req.files.push(file);
                })
            })
            next();
        })
        .catch(() => {
            return res.status(500).json({error: 'Something went wrong'});
        });
    });
}

const resumeRoute = createResumeRoute({
    resumeService: null,
    fileUploadHandler: fileUploadHandler
});

module.exports = {
    resumeRoute,
}
